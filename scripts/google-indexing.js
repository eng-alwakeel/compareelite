#!/usr/bin/env node
require('dotenv').config();
/**
 * google-indexing.js — Request indexing via Google Indexing API
 *
 * Usage:
 *   node scripts/google-indexing.js              # submit unindexed URLs (up to BATCH_SIZE)
 *   node scripts/google-indexing.js --urls <u1>  # explicit URL list
 *   node scripts/google-indexing.js --new        # articles added in last 7 days
 *   node scripts/google-indexing.js --reset      # clear indexed-urls.json and resubmit all
 *
 * Resume behaviour:
 *   - Accepted URLs are tracked in data/indexed-urls.json
 *   - Each run skips already-accepted URLs and submits the next BATCH_SIZE
 *   - Run daily to drain the full list within ceil(total/BATCH_SIZE) days
 *
 * Requires env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *
 * Exit code: 0 if all submitted URLs accepted, 1 if any hard errors
 *            (quota-exceeded exits 0 — normal daily operation)
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ROOT         = path.resolve(__dirname, '..');
const MANIFEST     = path.join(ROOT, 'data', 'articles-manifest.json');
const INDEXED_FILE = path.join(ROOT, 'data', 'indexed-urls.json');
const SITE_URL     = 'https://compareelite.com';
const DELAY_MS     = 500;
const BATCH_SIZE   = 190; // stay under 200 URL/day hard quota

// ── Indexed-URL tracker ───────────────────────────────────────────────────────

function loadIndexed() {
  try {
    const raw = JSON.parse(fs.readFileSync(INDEXED_FILE, 'utf8'));
    return new Set(Array.isArray(raw.urls) ? raw.urls : []);
  } catch {
    return new Set();
  }
}

function saveIndexed(indexed) {
  fs.mkdirSync(path.dirname(INDEXED_FILE), { recursive: true });
  fs.writeFileSync(INDEXED_FILE, JSON.stringify({
    updatedAt: new Date().toISOString(),
    total: indexed.size,
    urls: [...indexed].sort(),
  }, null, 2) + '\n');
}

// ── Auth (OAuth2 refresh token) ───────────────────────────────────────────────

async function getAccessToken() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Missing env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
    process.exit(1);
  }

  const body = [
    'grant_type=refresh_token',
    `refresh_token=${encodeURIComponent(refreshToken)}`,
    `client_id=${encodeURIComponent(clientId)}`,
    `client_secret=${encodeURIComponent(clientSecret)}`,
  ].join('&');

  const bodyBuf = Buffer.from(body);
  const { status, data } = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path:     '/token',
      method:   'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': bodyBuf.length,
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });

  if (status !== 200 || !data.access_token) {
    console.error('❌ Failed to get access token:');
    console.error('   Status:', status);
    console.error('   Error: ', data.error || data);
    process.exit(1);
  }
  return data.access_token;
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

// ── Google Indexing API ───────────────────────────────────────────────────────

function notifyURL(url, token) {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(JSON.stringify({ url, type: 'URL_UPDATED' }));
    const req = https.request({
      hostname: 'indexing.googleapis.com',
      path:     '/v3/urlNotifications:publish',
      method:   'POST',
      headers: {
        'Authorization':  `Bearer ${token}`,
        'Content-Type':   'application/json',
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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const newOnly = args.includes('--new');
  const reset   = args.includes('--reset');

  if (reset) {
    fs.rmSync(INDEXED_FILE, { force: true });
    console.log('🗑  Cleared indexed-urls.json — all URLs will be resubmitted\n');
  }

  // Collect candidate URLs
  let allUrls;
  const urlsIdx = args.indexOf('--urls');
  if (urlsIdx !== -1) {
    allUrls = args.slice(urlsIdx + 1).filter((a) => a.startsWith('http'));
  } else {
    const slugs = slugsFromManifest(newOnly);
    allUrls = slugs.map((s) => `${SITE_URL}/blog/article/${s}`);
    // Also include static pages on a full run
    if (!newOnly) {
      allUrls = [
        `${SITE_URL}/`,
        `${SITE_URL}/about`,
        `${SITE_URL}/contact`,
        ...allUrls,
      ];
    }
  }

  // Filter out already-accepted URLs (resume logic)
  const indexed = loadIndexed();
  const pending = allUrls.filter((u) => !indexed.has(u));
  const batch   = pending.slice(0, BATCH_SIZE);

  console.log(`📋 Total URLs:    ${allUrls.length}`);
  console.log(`✅ Already indexed: ${indexed.size}`);
  console.log(`⏳ Pending:       ${pending.length}`);
  console.log(`📦 This batch:    ${batch.length}  (limit ${BATCH_SIZE}/day)\n`);

  if (batch.length === 0) {
    console.log('🎉 All URLs already indexed. Nothing to submit.');
    process.exit(0);
  }

  console.log('🔐 Getting Google OAuth token...');
  const token = await getAccessToken();
  console.log(`✅ Token OK\n`);
  console.log(`📤 Submitting ${batch.length} URL(s):\n`);

  let ok = 0, fail = 0, quotaHit = false;
  const failures = [];

  for (let i = 0; i < batch.length; i++) {
    const url = batch[i];
    const { status, body } = await notifyURL(url, token);

    if (status === 200) {
      console.log(`✅ [${i + 1}/${batch.length}] ${url}`);
      indexed.add(url);
      ok++;
    } else if (status === 429) {
      console.log(`⚠️  [${i + 1}/${batch.length}] QUOTA HIT — stopping batch`);
      quotaHit = true;
      // Remaining URLs stay pending for tomorrow's run
      break;
    } else {
      const errMsg = (() => {
        try { return JSON.parse(body).error?.message || body.slice(0, 80); }
        catch { return body.slice(0, 80); }
      })();
      console.log(`❌ [${i + 1}/${batch.length}] HTTP ${status} — ${url}`);
      console.log(`   ${errMsg}`);
      fail++;
      failures.push({ url, status, body });
    }

    if (i < batch.length - 1) await sleep(DELAY_MS);
  }

  // Persist accepted URLs
  saveIndexed(indexed);

  const remaining = pending.length - ok;
  console.log('\n──────────────────────────────────────');
  console.log(`  ✅ Accepted:        ${ok}`);
  if (fail)     console.log(`  ❌ Errors:          ${fail}`);
  if (quotaHit) console.log(`  ⚠️  Quota hit:      stopped early`);
  console.log(`  📋 Still pending:   ${remaining > 0 ? remaining : 0}`);
  if (remaining > 0) {
    const daysLeft = Math.ceil(remaining / BATCH_SIZE);
    console.log(`  📅 Days to complete: ~${daysLeft}`);
  }
  console.log('──────────────────────────────────────\n');

  // Save run report
  const report = {
    submittedAt: new Date().toISOString(),
    batchSize: BATCH_SIZE,
    total: allUrls.length,
    alreadyIndexed: indexed.size - ok,
    submitted: batch.length,
    ok,
    failed: fail,
    quotaHit,
    remaining: Math.max(0, remaining),
    failures,
  };
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'google-indexing-report.json'),
    JSON.stringify(report, null, 2) + '\n');

  // Exit 1 only on hard errors, not quota
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
