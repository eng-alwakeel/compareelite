#!/usr/bin/env node
/**
 * google-indexing.js — Submit URLs to Google Indexing API
 *
 * Usage:
 *   node scripts/google-indexing.js --urls <url1> <url2> ...
 *   node scripts/google-indexing.js          # reads all slugs from data/articles-manifest.json
 *   node scripts/google-indexing.js --new    # articles added in last 7 days
 *
 * Requires env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *
 * Exit code: 0 if all OK, 1 if any failures
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ROOT         = path.resolve(__dirname, '..');
const MANIFEST     = path.join(ROOT, 'data', 'articles-manifest.json');
const SITE_URL     = 'https://compareelite.com';
const DELAY_MS     = 200;

// ── OAuth ─────────────────────────────────────────────────────────────────────

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method:   'POST',
      headers:  { 'Content-Length': Buffer.byteLength(bodyStr), ...headers },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function getAccessToken() {
  const refreshToken  = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId      = process.env.GOOGLE_CLIENT_ID;
  const clientSecret  = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    console.error('❌ Missing env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
    process.exit(1);
  }

  const body = [
    'grant_type=refresh_token',
    `refresh_token=${encodeURIComponent(refreshToken)}`,
    `client_id=${encodeURIComponent(clientId)}`,
    `client_secret=${encodeURIComponent(clientSecret)}`,
  ].join('&');

  const res  = await httpsPost('https://oauth2.googleapis.com/token',
    { 'Content-Type': 'application/x-www-form-urlencoded' }, body);
  const data = JSON.parse(res.body);

  if (!data.access_token) {
    console.error('❌ Failed to get access token:', res.body);
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

  // --new: only articles updated in last 7 days
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

// ── Indexing API call ─────────────────────────────────────────────────────────

async function notifyURL(url, token) {
  return httpsPost(
    'https://indexing.googleapis.com/v3/urlNotifications:publish',
    { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    JSON.stringify({ url, type: 'URL_UPDATED' }),
  );
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const newOnly = args.includes('--new');

  // Collect URLs: --urls takes explicit list, otherwise derive from manifest
  let urls;
  const urlsIdx = args.indexOf('--urls');
  if (urlsIdx !== -1) {
    urls = args.slice(urlsIdx + 1).filter((a) => a.startsWith('http'));
  } else {
    const slugs = slugsFromManifest(newOnly);
    urls = slugs.map((s) => `${SITE_URL}/blog/article/${s}`);
  }

  if (urls.length === 0) {
    console.log('No URLs to submit.');
    process.exit(0);
  }

  console.log('🔐 Getting Google OAuth token...');
  const token = await getAccessToken();
  console.log(`✅ Token OK\n`);
  console.log(`📤 Submitting ${urls.length} URL(s) to Google Indexing API:\n`);

  let ok = 0, fail = 0, quota = 0;
  const failures = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const { status, body } = await notifyURL(url, token);

    if (status === 200) {
      console.log(`✅ [${i + 1}/${urls.length}] ${url}`);
      ok++;
    } else if (status === 429) {
      console.log(`⚠️  [${i + 1}/${urls.length}] QUOTA EXCEEDED — ${url}`);
      quota++;
      failures.push({ url, status, body });
    } else {
      const errMsg = (() => {
        try { return JSON.parse(body).error?.message || body.slice(0, 80); }
        catch { return body.slice(0, 80); }
      })();
      console.log(`❌ [${i + 1}/${urls.length}] HTTP ${status} — ${url}`);
      console.log(`   ${errMsg}`);
      fail++;
      failures.push({ url, status, body });
    }

    if (i < urls.length - 1) await sleep(DELAY_MS);
  }

  console.log('\n──────────────────────────────────────');
  console.log(`  ✅ Accepted:        ${ok}`);
  if (fail)  console.log(`  ❌ Errors:          ${fail}`);
  if (quota) console.log(`  ⚠️  Quota exceeded: ${quota}`);
  console.log('──────────────────────────────────────\n');

  // Save report
  const report = {
    submittedAt: new Date().toISOString(),
    total: urls.length,
    ok,
    failed: fail + quota,
    failures,
  };
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'google-indexing-report.json'),
    JSON.stringify(report, null, 2) + '\n');

  process.exit(fail + quota > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
