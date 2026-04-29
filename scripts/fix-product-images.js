#!/usr/bin/env node
/**
 * Fix broken product images by scraping real image IDs from Amazon.
 *
 * Many articles have product images that return 404 (fake/hallucinated
 * image IDs) or 43-byte GIF placeholders (the images-na.ssl-images-amazon.com
 * fallback returns blank GIFs for ASINs without proper product images).
 *
 * For each product whose image fails liveness probe, this script:
 *   1. Fetches https://www.amazon.com/dp/<ASIN>
 *   2. Extracts the real image URL from data-a-dynamic-image / og:image / hiRes
 *   3. Normalises to /images/I/<ID>._SL500_.jpg
 *   4. Updates the article JSON
 *   5. Re-syncs thumbnail = products[0].image
 *
 * IMPORTANT: Run from a residential IP. Amazon serves CAPTCHA pages
 * (HTTP 200 with a "Click below to continue" body) to datacenter IPs,
 * which the script reports as "no-img-found".
 *
 *   node scripts/fix-product-images.js              # fix all broken images
 *   node scripts/fix-product-images.js --slug X     # one article only
 *   node scripts/fix-product-images.js --dry-run    # report only, no writes
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'articles');

const UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0';
const HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'identity',
};
const FETCH_TIMEOUT_MS = 15000;
const PROBE_TIMEOUT_MS = 8000;
const PROBE_CONCURRENCY = 4;
const FETCH_DELAY_MS = 1500;
const FETCH_DELAY_JITTER_MS = 500;
const RATE_LIMIT_BACKOFF_MS = 5000;

function fetchPage(asin) {
  return new Promise((res) => {
    const req = https.request(
      'https://www.amazon.com/dp/' + asin,
      { method: 'GET', headers: HEADERS },
      (r) => {
        let d = '';
        r.on('data', (c) => { d += c; if (d.length > 800000) r.destroy(); });
        r.on('end', () => res({ asin, status: r.statusCode, html: d }));
        r.on('close', () => res({ asin, status: r.statusCode, html: d }));
      }
    );
    req.on('error', (e) => res({ asin, err: e.code }));
    req.setTimeout(FETCH_TIMEOUT_MS, () => { req.destroy(); res({ asin, err: 'timeout' }); });
    req.end();
  });
}

function probeImg(url) {
  return new Promise((res) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'GET', headers: { 'User-Agent': UA } },
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

function extractImageUrl(html) {
  if (!html || html.length < 8000) return null; // CAPTCHA page is ~5KB
  // Best: data-a-dynamic-image JSON map (gives largest variant)
  let m = html.match(/data-a-dynamic-image="([^"]+)"/);
  if (m) {
    const decoded = m[1].replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
    try {
      const obj = JSON.parse(decoded);
      let best = null, bestArea = 0;
      for (const [u, dims] of Object.entries(obj)) {
        if (Array.isArray(dims) && dims.length === 2) {
          const a = dims[0] * dims[1];
          if (a > bestArea) { bestArea = a; best = u; }
        }
      }
      if (best) return best;
    } catch {}
  }
  // og:image
  m = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (m && m[1].includes('m.media-amazon.com/images/I/')) return m[1];
  // hiRes
  m = html.match(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.jpg)"/);
  if (m) return m[1];
  return null;
}

function normalize(url) {
  if (!url) return null;
  const m = url.match(/(https:\/\/m\.media-amazon\.com\/images\/I\/)([^.]+)/);
  if (m) return m[1] + m[2] + '._SL500_.jpg';
  return url;
}

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

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const slugIdx = args.indexOf('--slug');
  const slugFilter = slugIdx >= 0 ? args[slugIdx + 1] : null;

  const articles = loadArticles(slugFilter);
  if (articles.length === 0) {
    console.error('No articles matched.');
    process.exit(1);
  }

  // Build the queue of (asin → product image) entries to probe.
  const queue = [];
  for (const { a } of articles) {
    (a.products || []).forEach((p, i) => {
      const m = (p.link || '').match(/\/dp\/([A-Z0-9]{10})/);
      if (!m) return;
      queue.push({ slug: a.slug, idx: i, asin: m[1], image: p.image });
    });
  }

  console.log(`Probing ${queue.length} product images...`);
  const needsFix = [];
  for (let i = 0; i < queue.length; i += PROBE_CONCURRENCY) {
    const batch = queue.slice(i, i + PROBE_CONCURRENCY);
    const r = await Promise.all(batch.map((it) => probeImg(it.image).then((p) => ({ ...it, probe: p }))));
    for (const x of r) if (!isImgGood(x.probe)) needsFix.push(x);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`Need fix: ${needsFix.length}`);

  if (needsFix.length === 0) {
    console.log('All product images are live ✅');
    return;
  }

  // De-duplicate by ASIN — many articles can share the same broken ASIN.
  const asinToNewImage = new Map();
  const uniqueAsins = [...new Set(needsFix.map((it) => it.asin))];
  console.log(`Unique ASINs to look up: ${uniqueAsins.length}`);

  let extracted = 0, captcha = 0, http5xx = 0, http404 = 0, other = 0;
  for (let i = 0; i < uniqueAsins.length; i++) {
    const asin = uniqueAsins[i];
    process.stdout.write(`[${i + 1}/${uniqueAsins.length}] ${asin} `);
    const r = await fetchPage(asin);
    let backoff = FETCH_DELAY_MS + Math.random() * FETCH_DELAY_JITTER_MS;
    if (r.err) {
      console.log('ERR', r.err);
      other++;
      backoff = RATE_LIMIT_BACKOFF_MS;
    } else if (r.status === 404) {
      console.log('HTTP 404 (dead ASIN)');
      http404++;
    } else if (r.status >= 500) {
      console.log('HTTP', r.status, '(rate-limited)');
      http5xx++;
      backoff = RATE_LIMIT_BACKOFF_MS;
    } else if (r.status === 200) {
      const img = extractImageUrl(r.html);
      if (img) {
        const normalized = normalize(img);
        asinToNewImage.set(asin, normalized);
        console.log('OK ', normalized.slice(40));
        extracted++;
      } else {
        // HTML 200 but tiny / CAPTCHA-shaped → datacenter IP block
        console.log('CAPTCHA (run from residential IP)');
        captcha++;
        backoff = RATE_LIMIT_BACKOFF_MS;
      }
    } else {
      console.log('HTTP', r.status);
      other++;
    }
    await new Promise((r) => setTimeout(r, backoff));
  }

  console.log('');
  console.log(`Summary: extracted=${extracted} captcha=${captcha} http5xx=${http5xx} http404=${http404} other=${other}`);

  if (dryRun) {
    console.log('Dry run — no files written.');
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

  if (captcha + http5xx > 0) {
    console.log('');
    console.log(`⚠️  ${captcha + http5xx} ASINs were blocked. Run again later — or from a different IP — to fix the rest.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
