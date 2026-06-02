#!/usr/bin/env node
require('dotenv').config();
/**
 * bing-submit.js — Submit URLs to Bing Webmaster URL Submission API
 *
 * Usage:
 *   node scripts/bing-submit.js           # resume: submit next 90 unsubmitted URLs
 *   node scripts/bing-submit.js --new     # articles updated in last 7 days
 *   node scripts/bing-submit.js --reset   # clear tracker and resubmit all
 *   node scripts/bing-submit.js --urls <url1> <url2> ...
 *
 * Resume behaviour:
 *   - Submitted URLs are tracked in data/bing-indexed-urls.json
 *   - Each run skips already-submitted URLs and submits next BATCH_SIZE
 *
 * Requires env var: BING_API_KEY
 * Saves report to data/bing-submit-report.json
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ROOT         = path.resolve(__dirname, '..');
const MANIFEST     = path.join(ROOT, 'data', 'articles-manifest.json');
const INDEXED_FILE = path.join(ROOT, 'data', 'bing-indexed-urls.json');
const SITE_URL     = 'https://compareelite.com';
const BATCH_SIZE   = 90;
const API_KEY      = process.env.BING_API_KEY;

if (!API_KEY) {
  console.error('❌ BING_API_KEY env var is not set');
  process.exit(1);
}

// ── Tracker ───────────────────────────────────────────────────────────────────

function loadSubmitted() {
  try {
    const raw = JSON.parse(fs.readFileSync(INDEXED_FILE, 'utf8'));
    return new Set(Array.isArray(raw.urls) ? raw.urls : []);
  } catch {
    return new Set();
  }
}

function saveSubmitted(submitted) {
  fs.mkdirSync(path.dirname(INDEXED_FILE), { recursive: true });
  fs.writeFileSync(INDEXED_FILE, JSON.stringify({
    updatedAt: new Date().toISOString(),
    total: submitted.size,
    urls: [...submitted].sort(),
  }, null, 2) + '\n');
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
  const reset   = args.includes('--reset');

  if (reset) {
    fs.rmSync(INDEXED_FILE, { force: true });
    console.log('🗑  Cleared bing-indexed-urls.json — all URLs will be resubmitted\n');
  }

  // Build full URL list
  let allUrls;
  const urlsIdx = args.indexOf('--urls');
  if (urlsIdx !== -1) {
    allUrls = args.slice(urlsIdx + 1).filter((a) => a.startsWith('http'));
  } else {
    const slugs = slugsFromManifest(newOnly);
    allUrls = [
      `${SITE_URL}/`,
      `${SITE_URL}/about`,
      `${SITE_URL}/contact`,
      ...slugs.map((s) => `${SITE_URL}/blog/article/${s}`),
    ];
  }

  // Filter already-submitted
  const submitted = loadSubmitted();
  const pending   = allUrls.filter((u) => !submitted.has(u));
  const batch     = pending.slice(0, BATCH_SIZE);

  console.log(`📋 Total URLs:       ${allUrls.length}`);
  console.log(`✅ Already submitted: ${submitted.size}`);
  console.log(`⏳ Pending:          ${pending.length}`);
  console.log(`📦 Submitting now:   ${batch.length}  (limit ${BATCH_SIZE}/run)\n`);

  if (batch.length === 0) {
    console.log('🎉 All URLs already submitted to Bing. Nothing to do.');
    process.exit(0);
  }

  const { status, body } = await submitBatch(batch);

  let ok = false;
  let message = '';
  try {
    const parsed = JSON.parse(body);
    ok = status === 200 && (parsed.d === null || parsed.d === undefined || parsed.d === '');
    message = JSON.stringify(parsed);
  } catch {
    message = body.slice(0, 200);
  }

  if (ok) {
    batch.forEach((u) => submitted.add(u));
    saveSubmitted(submitted);
    console.log(`✅ Bing accepted ${batch.length} URL(s)  (HTTP ${status})`);
  } else {
    console.log(`❌ Bing returned HTTP ${status}`);
    console.log(`   Response: ${message}`);
  }

  const remaining = pending.length - (ok ? batch.length : 0);
  console.log('\n──────────────────────────────────────');
  console.log(`  ${ok ? '✅' : '❌'} Status:          HTTP ${status}`);
  console.log(`  📤 Submitted today: ${ok ? batch.length : 0}`);
  console.log(`  📋 Total remaining: ${remaining}`);
  if (remaining > 0) {
    const runs = Math.ceil(remaining / BATCH_SIZE);
    console.log(`  📅 Runs to finish:  ~${runs}`);
  }
  console.log('──────────────────────────────────────\n');

  const report = {
    submittedAt: new Date().toISOString(),
    batchSize: BATCH_SIZE,
    total: allUrls.length,
    alreadySubmitted: submitted.size - (ok ? batch.length : 0),
    submittedThisRun: ok ? batch.length : 0,
    remaining,
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
