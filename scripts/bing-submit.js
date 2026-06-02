#!/usr/bin/env node
require('dotenv').config();
/**
 * bing-submit.js — Submit URLs to Bing Webmaster URL Submission API
 *
 * Usage:
 *   node scripts/bing-submit.js           # all 208 articles + static pages
 *   node scripts/bing-submit.js --new     # articles updated in last 7 days
 *   node scripts/bing-submit.js --urls <url1> <url2> ...
 *
 * Requires env var:
 *   BING_API_KEY=<your_key>
 *
 * Bing allows 10,000 URLs/day — no batching needed.
 * Saves report to data/bing-submit-report.json
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ROOT      = path.resolve(__dirname, '..');
const MANIFEST  = path.join(ROOT, 'data', 'articles-manifest.json');
const SITE_URL  = 'https://compareelite.com';
const API_KEY   = process.env.BING_API_KEY;

if (!API_KEY) {
  console.error('❌ BING_API_KEY env var is not set');
  process.exit(1);
}

// ── URL resolution ────────────────────────────────────────────────────────────

function slugsFromManifest(newOnly = false) {
  if (!fs.existsSync(MANIFEST)) {
    console.error('❌ data/articles-manifest.json not found');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const slugs = Array.isArray(manifest)
    ? manifest.map((e) => (typeof e === 'string' ? e : e.slug))
    : (manifest.slugs || manifest.articles || Object.keys(manifest));

  if (!newOnly) return slugs;

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return slugs.filter((slug) => {
    try {
      const f = path.join(ROOT, 'articles', `${slug}.json`);
      const a = JSON.parse(fs.readFileSync(f, 'utf8'));
      const ts = new Date(a.date || a.last_updated || a.generatedAt || 0).getTime();
      return ts >= cutoff;
    } catch { return false; }
  });
}

// ── Bing URL Submission API ───────────────────────────────────────────────────

function submitBatch(urlList) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify({ siteUrl: SITE_URL, urlList });
    const bodyBuf = Buffer.from(bodyStr);
    const req = https.request({
      hostname: 'ssl.bing.com',
      path:     `/webmaster/api.svc/json/SubmitUrlbatch?apikey=${API_KEY}`,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json; charset=utf-8',
        'Content-Length': bodyBuf.length,
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const newOnly = args.includes('--new');

  let urls;
  const urlsIdx = args.indexOf('--urls');
  if (urlsIdx !== -1) {
    urls = args.slice(urlsIdx + 1).filter((a) => a.startsWith('http'));
  } else {
    const slugs = slugsFromManifest(newOnly);
    urls = [
      `${SITE_URL}/`,
      `${SITE_URL}/about`,
      `${SITE_URL}/contact`,
      ...slugs.map((s) => `${SITE_URL}/blog/article/${s}`),
    ];
  }

  if (urls.length === 0) {
    console.log('No URLs to submit.');
    process.exit(0);
  }

  console.log(`📤 Submitting ${urls.length} URL(s) to Bing Webmaster API...\n`);

  const { status, body } = await submitBatch(urls);

  let ok = false;
  let message = '';
  try {
    const parsed = JSON.parse(body);
    // Bing returns {"d":null} on success
    ok = status === 200 && (parsed.d === null || parsed.d === undefined || parsed.d === '');
    message = JSON.stringify(parsed);
  } catch {
    message = body.slice(0, 200);
  }

  if (ok) {
    console.log(`✅ Bing accepted ${urls.length} URL(s)  (HTTP ${status})`);
  } else {
    console.log(`❌ Bing returned HTTP ${status}`);
    console.log(`   Response: ${message}`);
  }

  console.log('\n──────────────────────────────────────');
  console.log(`  ${ok ? '✅' : '❌'} Status: HTTP ${status}`);
  console.log(`  URLs submitted: ${urls.length}`);
  console.log('──────────────────────────────────────\n');

  const report = {
    submittedAt: new Date().toISOString(),
    total: urls.length,
    status,
    ok,
    message,
  };
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'bing-submit-report.json'),
    JSON.stringify(report, null, 2) + '\n');

  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
