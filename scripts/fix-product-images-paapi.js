#!/usr/bin/env node
/**
 * Fix broken product images using Amazon PA-API 5.0 (GetItems).
 *
 * Replaces /images/P/<ASIN>… placeholders (43-byte blank GIFs) and
 * stale /images/I/<ID>… 404s with real image URLs fetched from the
 * official Product Advertising API.
 *
 * Required env vars:
 *   AMAZON_ACCESS_KEY   — PA-API access key ID
 *   AMAZON_SECRET_KEY   — PA-API secret access key
 *
 * Optional env vars:
 *   AMAZON_PARTNER_TAG  — defaults to "compareelite-20"
 *   AMAZON_MARKETPLACE  — defaults to "www.amazon.com"
 *
 * Usage:
 *   node scripts/fix-product-images-paapi.js              # fix all broken images
 *   node scripts/fix-product-images-paapi.js --slug X     # one article only
 *   node scripts/fix-product-images-paapi.js --dry-run    # report, no writes
 *   node scripts/fix-product-images-paapi.js --all        # probe all images (not just /P/)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'articles');

const ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG || 'compareelite-20';
const MARKETPLACE = process.env.AMAZON_MARKETPLACE || 'www.amazon.com';

const PAAPI_HOST = 'webservices.amazon.com';
const PAAPI_PATH = '/paapi5/getitems';
const PAAPI_REGION = 'us-east-1';
const PAAPI_SERVICE = 'ProductAdvertisingAPI';
const PAAPI_TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems';

const BATCH_SIZE = 10; // PA-API max items per GetItems call
const BATCH_DELAY_MS = 1100; // stay under 1 req/sec default quota
const PROBE_TIMEOUT_MS = 8000;
const PROBE_CONCURRENCY = 4;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── AWS Signature V4 ────────────────────────────────────────────────────────

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function hash(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function signRequest(method, host, path_, payload, accessKey, secretKey) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = hash(payload);

  const canonicalHeaders = [
    'content-encoding:amz-1.0',
    `content-type:application/json; charset=utf-8`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${PAAPI_TARGET}`,
  ].join('\n') + '\n';

  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';

  const canonicalRequest = [
    method,
    path_,
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${PAAPI_REGION}/${PAAPI_SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(secretKey, dateStamp, PAAPI_REGION, PAAPI_SERVICE);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Authorization': authorization,
    'Content-Encoding': 'amz-1.0',
    'Content-Type': 'application/json; charset=utf-8',
    'Host': host,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': PAAPI_TARGET,
  };
}

// ─── PA-API call ─────────────────────────────────────────────────────────────

function paapiGetItems(asins) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      ItemIds: asins,
      Resources: ['Images.Primary.Large', 'Images.Primary.Medium'],
      PartnerTag: PARTNER_TAG,
      PartnerType: 'Associates',
      Marketplace: MARKETPLACE,
    });

    const headers = signRequest('POST', PAAPI_HOST, PAAPI_PATH, body, ACCESS_KEY, SECRET_KEY);
    headers['Content-Length'] = Buffer.byteLength(body);

    const req = https.request(
      { hostname: PAAPI_HOST, path: PAAPI_PATH, method: 'POST', headers },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            resolve({ error: `HTTP ${res.statusCode}`, body: data });
            return;
          }
          try {
            resolve({ ok: true, data: JSON.parse(data) });
          } catch (e) {
            resolve({ error: 'json-parse', body: data });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ error: e.code }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

function extractImageFromItem(item) {
  const primary = item?.Images?.Primary;
  const large = primary?.Large?.URL;
  const medium = primary?.Medium?.URL;
  return large || medium || null;
}

// ─── Image probe ─────────────────────────────────────────────────────────────

function probeImg(url) {
  return new Promise((res) => {
    try {
      const u = new URL(url);
      const req = https.request(
        { hostname: u.hostname, path: u.pathname + u.search, method: 'HEAD' },
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
    } catch (e) {
      res({ err: 'invalid-url' });
    }
  });
}

function isImgGood(r) {
  if (r.err) return false;
  if (r.status !== 200) return false;
  // 43-byte GIF = blank placeholder
  if (r.cl > 0 && r.cl <= 100) return false;
  return true;
}

// ─── Article loading ──────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!ACCESS_KEY || !SECRET_KEY) {
    console.error('');
    console.error('ERROR: Missing PA-API credentials.');
    console.error('  Set AMAZON_ACCESS_KEY and AMAZON_SECRET_KEY environment variables.');
    console.error('');
    console.error('  To get credentials:');
    console.error('  1. Sign in at https://affiliate-program.amazon.com/');
    console.error('  2. Navigate to Tools > Product Advertising API');
    console.error('  3. Generate access key for affiliate tag: compareelite-20');
    console.error('');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fixAll = args.includes('--all'); // probe all images, not just known-bad /P/ URLs
  const slugIdx = args.indexOf('--slug');
  const slugFilter = slugIdx >= 0 ? args[slugIdx + 1] : null;

  const articles = loadArticles(slugFilter);
  if (articles.length === 0) {
    console.error('No articles matched.');
    process.exit(1);
  }

  // Build product queue
  const queue = [];
  for (const { a } of articles) {
    for (let i = 0; i < (a.products || []).length; i++) {
      const p = a.products[i];
      const m = (p.link || '').match(/\/dp\/([A-Z0-9]{10})/);
      if (!m) continue;
      const isKnownBad = p.image && p.image.includes('/images/P/');
      queue.push({ slug: a.slug, idx: i, asin: m[1], image: p.image, isKnownBad });
    }
  }

  // Determine which ASINs need fixing
  let needsFix;
  if (fixAll) {
    console.log(`Probing all ${queue.length} product images...`);
    const needsFixArr = [];
    for (let i = 0; i < queue.length; i += PROBE_CONCURRENCY) {
      const batch = queue.slice(i, i + PROBE_CONCURRENCY);
      const results = await Promise.all(
        batch.map((it) => probeImg(it.image).then((p) => ({ ...it, probe: p })))
      );
      for (const x of results) if (!isImgGood(x.probe)) needsFixArr.push(x);
      await sleep(150);
    }
    needsFix = needsFixArr;
    console.log(`Need fix: ${needsFix.length}`);
  } else {
    needsFix = queue.filter((it) => it.isKnownBad);
    console.log(`Known broken /images/P/ placeholders: ${needsFix.length}`);
  }

  if (needsFix.length === 0) {
    console.log('No broken images found ✅');
    return;
  }

  // Deduplicate by ASIN
  const uniqueAsins = [...new Set(needsFix.map((it) => it.asin))];
  console.log(`Unique ASINs to look up via PA-API: ${uniqueAsins.length}`);
  console.log(`Batches of ${BATCH_SIZE}: ${Math.ceil(uniqueAsins.length / BATCH_SIZE)}`);
  console.log('');

  // Fetch images from PA-API in batches
  const asinToImage = new Map();
  let found = 0, notFound = 0, errors = 0;

  for (let i = 0; i < uniqueAsins.length; i += BATCH_SIZE) {
    const batch = uniqueAsins.slice(i, i + BATCH_SIZE);
    process.stdout.write(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueAsins.length / BATCH_SIZE)} [${batch.join(', ')}] ... `);

    const result = await paapiGetItems(batch);

    if (!result.ok) {
      console.log(`ERROR: ${result.error}`);
      if (result.body) {
        try {
          const errBody = JSON.parse(result.body);
          console.log('  Detail:', JSON.stringify(errBody.__type || errBody.Errors, null, 2));
        } catch {}
      }
      errors += batch.length;
    } else {
      const items = result.data?.ItemsResult?.Items || [];
      for (const item of items) {
        const asin = item.ASIN;
        const imgUrl = extractImageFromItem(item);
        if (imgUrl) {
          asinToImage.set(asin, imgUrl);
          found++;
        } else {
          notFound++;
        }
      }
      // Items not returned = not found (dead ASIN, region mismatch, etc.)
      const returnedAsins = new Set(items.map((it) => it.ASIN));
      for (const asin of batch) {
        if (!returnedAsins.has(asin)) notFound++;
      }
      console.log(`OK (${items.length}/${batch.length} returned, ${items.filter(it => extractImageFromItem(it)).length} with images)`);
    }

    if (i + BATCH_SIZE < uniqueAsins.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log('');
  console.log(`PA-API summary: found=${found} not_found=${notFound} errors=${errors}`);
  console.log('');

  if (asinToImage.size === 0) {
    console.log('No images retrieved from PA-API. Nothing to write.');
    return;
  }

  if (dryRun) {
    console.log('Dry run — changes that would be applied:');
    for (const { slug, asin, image } of needsFix) {
      const newImg = asinToImage.get(asin);
      if (newImg && newImg !== image) {
        console.log(`  ${slug}: ${asin} → ${newImg}`);
      }
    }
    console.log('Dry run complete — no files written.');
    return;
  }

  // Apply fixes
  let articlesFixed = 0, imagesFixed = 0, thumbsFixed = 0;
  for (const { fp, a } of articles) {
    let changed = false;
    for (const p of a.products || []) {
      const m = (p.link || '').match(/\/dp\/([A-Z0-9]{10})/);
      if (!m) continue;
      const newImg = asinToImage.get(m[1]);
      if (newImg && p.image !== newImg) {
        p.image = newImg;
        imagesFixed++;
        changed = true;
      }
    }
    // Sync thumbnail to first product image
    const firstImg = a.products?.[0]?.image;
    if (firstImg && a.thumbnail !== firstImg) {
      a.thumbnail = firstImg;
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

  if (notFound > 0) {
    console.log('');
    console.log(`⚠️  ${notFound} ASINs had no image in PA-API (dead products or regional gap).`);
    console.log('   These may need manual replacement with active products.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
