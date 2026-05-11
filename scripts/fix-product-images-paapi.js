#!/usr/bin/env node
/**
 * Fix broken product images using the Amazon Product Advertising API v5.
 *
 * Unlike fix-product-images.js (which scrapes Amazon pages and gets CAPTCHA-blocked
 * from datacenter IPs), this script uses the official PA-API v5 GetItems endpoint.
 * PA-API is not IP-restricted and works from any server.
 *
 * Prerequisites:
 *   AMAZON_ACCESS_KEY  — PA-API access key ID
 *   AMAZON_SECRET_KEY  — PA-API secret access key
 *   Associate tag is hardcoded to compareelite-20 (must match the key's account)
 *
 * Usage:
 *   node scripts/fix-product-images-paapi.js              # fix all broken images
 *   node scripts/fix-product-images-paapi.js --slug X     # one article only
 *   node scripts/fix-product-images-paapi.js --dry-run    # report only, no writes
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'articles');

const ASSOCIATE_TAG = 'compareelite-20';
const PAAPI_HOST = 'webservices.amazon.com';
const PAAPI_PATH = '/paapi5/getitems';
const PAAPI_REGION = 'us-east-1';
const PAAPI_SERVICE = 'ProductAdvertisingAPI';
const PAAPI_TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems';
const PAAPI_CONTENT_TYPE = 'application/json; charset=UTF-8';
const PAAPI_BATCH_SIZE = 10;
const PAAPI_BATCH_DELAY_MS = 1100; // stay under 1 req/sec default rate limit

const PROBE_TIMEOUT_MS = 8000;
const PROBE_CONCURRENCY = 4;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── AWS Signature V4 ────────────────────────────────────────────────────────

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function buildAuthHeaders(accessKey, secretKey, payload) {
  const now = new Date();
  // amzDate: YYYYMMDDTHHMMSSZ
  const amzDate =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0') + 'T' +
    String(now.getUTCHours()).padStart(2, '0') +
    String(now.getUTCMinutes()).padStart(2, '0') +
    String(now.getUTCSeconds()).padStart(2, '0') + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256hex(payload);
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:${PAAPI_CONTENT_TYPE}\n` +
    `host:${PAAPI_HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${PAAPI_TARGET}\n`;
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';

  const canonicalRequest = [
    'POST',
    PAAPI_PATH,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${PAAPI_REGION}/${PAAPI_SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(secretKey, dateStamp, PAAPI_REGION, PAAPI_SERVICE);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { amzDate, authorization };
}

// ─── PA-API call ─────────────────────────────────────────────────────────────

function paapiGetItems(accessKey, secretKey, asins) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      PartnerTag: ASSOCIATE_TAG,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com',
      ItemIds: asins,
      Resources: ['Images.Primary.Large', 'Images.Primary.Medium'],
    });

    const { amzDate, authorization } = buildAuthHeaders(accessKey, secretKey, body);

    const options = {
      hostname: PAAPI_HOST,
      path: PAAPI_PATH,
      method: 'POST',
      headers: {
        'Content-Type': PAAPI_CONTENT_TYPE,
        'Content-Encoding': 'amz-1.0',
        'Content-Length': Buffer.byteLength(body),
        'Host': PAAPI_HOST,
        'X-Amz-Date': amzDate,
        'X-Amz-Target': PAAPI_TARGET,
        'Authorization': authorization,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data, parseError: true });
        }
      });
    });
    req.on('error', (e) => resolve({ err: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ err: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

// ─── Image probing ───────────────────────────────────────────────────────────

function probeImg(url) {
  return new Promise((res) => {
    if (!url || !url.startsWith('http')) return res({ err: 'no-url' });
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'GET' },
      (r) => {
        const ct = r.headers['content-type'] || '';
        const cl = parseInt(r.headers['content-length'] || '0', 10);
        r.destroy();
        res({ status: r.statusCode, ct, cl });
      }
    );
    req.on('error', (e) => res({ err: e.code }));
    req.setTimeout(PROBE_TIMEOUT_MS, () => { req.destroy(); res({ err: 'timeout' }); });
    req.end();
  });
}

function isImgGood(r) {
  return r.status === 200 && /image\/(jpe?g|png|webp)/.test(r.ct || '') && r.cl > 500;
}

// ─── Article loading ─────────────────────────────────────────────────────────

function loadArticles(slugFilter) {
  const out = [];
  for (const f of fs.readdirSync(ARTICLES_DIR).sort()) {
    if (!f.endsWith('.json') || f === 'TEMPLATE.json') continue;
    const fp = path.join(ARTICLES_DIR, f);
    const a = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (slugFilter && a.slug !== slugFilter) continue;
    out.push({ f, fp, a });
  }
  return out;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  if (!accessKey || !secretKey) {
    console.error('ERROR: AMAZON_ACCESS_KEY and AMAZON_SECRET_KEY must be set.');
    console.error('');
    console.error('Provision credentials at: https://affiliate-program.amazon.com/');
    console.error('  → Tools → Product Advertising API → Manage your credentials');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const slugIdx = args.indexOf('--slug');
  const slugFilter = slugIdx >= 0 ? args[slugIdx + 1] : null;

  const articles = loadArticles(slugFilter);
  if (articles.length === 0) {
    console.error('No articles matched.');
    process.exit(1);
  }

  // Build queue of products needing image fix
  const queue = [];
  for (const { a } of articles) {
    (a.products || []).forEach((p, i) => {
      const m = (p.link || '').match(/\/dp\/([A-Z0-9]{10})/);
      if (!m) return;
      queue.push({ slug: a.slug, idx: i, asin: m[1], image: p.image });
    });
  }

  // Probe current image liveness
  console.log(`Probing ${queue.length} product images...`);
  const needsFix = [];
  for (let i = 0; i < queue.length; i += PROBE_CONCURRENCY) {
    const batch = queue.slice(i, i + PROBE_CONCURRENCY);
    const results = await Promise.all(batch.map((it) => probeImg(it.image).then((p) => ({ ...it, probe: p }))));
    for (const x of results) if (!isImgGood(x.probe)) needsFix.push(x);
    await sleep(100);
  }
  console.log(`Need fix: ${needsFix.length}`);

  if (needsFix.length === 0) {
    console.log('All product images are live ✅');
    return;
  }

  // Deduplicate ASINs
  const uniqueAsins = [...new Set(needsFix.map((it) => it.asin))];
  console.log(`Unique ASINs to look up via PA-API: ${uniqueAsins.length}`);
  console.log(`PA-API batches: ${Math.ceil(uniqueAsins.length / PAAPI_BATCH_SIZE)} (${PAAPI_BATCH_SIZE}/batch)`);

  // Fetch from PA-API in batches
  const asinToNewImage = new Map();
  let apiOk = 0, apiNotFound = 0, apiErr = 0;

  for (let i = 0; i < uniqueAsins.length; i += PAAPI_BATCH_SIZE) {
    const batch = uniqueAsins.slice(i, i + PAAPI_BATCH_SIZE);
    const batchNum = Math.floor(i / PAAPI_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(uniqueAsins.length / PAAPI_BATCH_SIZE);
    process.stdout.write(`Batch [${batchNum}/${totalBatches}] ${batch.length} ASINs... `);

    const result = await paapiGetItems(accessKey, secretKey, batch);

    if (result.err) {
      console.log(`ERR: ${result.err}`);
      apiErr += batch.length;
    } else if (result.status !== 200) {
      const msg = result.body?.Errors?.[0]?.Message || JSON.stringify(result.body).slice(0, 120);
      console.log(`HTTP ${result.status}: ${msg}`);
      apiErr += batch.length;
    } else {
      const items = result.body?.ItemsResult?.Items || [];
      for (const item of items) {
        const asin = item.ASIN;
        const imgUrl =
          item.Images?.Primary?.Large?.URL ||
          item.Images?.Primary?.Medium?.URL;
        if (imgUrl) {
          // Normalize to SL500
          const m = imgUrl.match(/(https:\/\/m\.media-amazon\.com\/images\/I\/)([^.]+)/);
          const normalized = m ? m[1] + m[2] + '._SL500_.jpg' : imgUrl;
          asinToNewImage.set(asin, normalized);
          apiOk++;
        } else {
          apiNotFound++;
        }
      }
      // ASINs not in response are not found / discontinued
      const returnedAsins = new Set(items.map((it) => it.ASIN));
      for (const asin of batch) {
        if (!returnedAsins.has(asin)) apiNotFound++;
      }
      console.log(`OK (${items.length} items returned, ${items.length - (batch.length - items.length)} with images)`);
    }

    if (i + PAAPI_BATCH_SIZE < uniqueAsins.length) {
      await sleep(PAAPI_BATCH_DELAY_MS);
    }
  }

  console.log('');
  console.log(`PA-API summary: found=${apiOk} not_found=${apiNotFound} errors=${apiErr}`);

  if (dryRun) {
    console.log('');
    console.log('Dry run — no files written. Run without --dry-run to apply.');
    if (asinToNewImage.size > 0) {
      console.log('Sample images found:');
      let count = 0;
      for (const [asin, url] of asinToNewImage) {
        console.log(`  ${asin}: ${url}`);
        if (++count >= 5) { console.log(`  ... and ${asinToNewImage.size - 5} more`); break; }
      }
    }
    return;
  }

  // Apply fixes
  let articlesFixed = 0, imagesFixed = 0, thumbsFixed = 0;
  for (const { fp, a } of articles) {
    let changed = false;
    for (const p of a.products || []) {
      const m = (p.link || '').match(/\/dp\/([A-Z0-9]{10})/);
      if (!m) continue;
      const newImg = asinToNewImage.get(m[1]);
      if (newImg && p.image !== newImg) {
        p.image = newImg;
        imagesFixed++;
        changed = true;
      }
    }
    // Sync thumbnail to products[0].image
    if (a.products && a.products[0] && a.products[0].image && a.thumbnail !== a.products[0].image) {
      a.thumbnail = a.products[0].image;
      thumbsFixed++;
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(fp, JSON.stringify(a, null, 2) + '\n');
      articlesFixed++;
      console.log(`✅ ${path.basename(fp)}`);
    }
  }

  console.log('');
  console.log(`Articles fixed: ${articlesFixed}`);
  console.log(`Images fixed:   ${imagesFixed}`);
  console.log(`Thumbs synced:  ${thumbsFixed}`);

  if (apiErr > 0) {
    console.log(`\n⚠️  ${apiErr} ASINs had API errors. Re-run to retry.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
