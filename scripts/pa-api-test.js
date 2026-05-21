#!/usr/bin/env node
/**
 * pa-api-test.js — Test Amazon Creators API v3.1 (OAuth2 / LWA)
 *
 * Usage:
 *   node scripts/pa-api-test.js                   # test with tokens from .env
 *   node scripts/pa-api-test.js --auth-url         # print authorization URL (first-time setup)
 *
 * Required env vars:
 *   AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_PARTNER_TAG
 *
 * Optional (after first authorization):
 *   AMAZON_REFRESH_TOKEN                           # obtained via --auth-url flow
 */

'use strict';

require('dotenv').config();
const https = require('https');

const CLIENT_ID     = process.env.AMAZON_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;
const PARTNER_TAG   = process.env.AMAZON_PARTNER_TAG || 'compareelite-20';
const REFRESH_TOKEN = process.env.AMAZON_REFRESH_TOKEN;

// Creators API v3.1 scope — adjust if Amazon provides a different scope
const SCOPE        = 'cpc_advertising:campaign_management';
const REDIRECT_URI = 'https://compareelite.com/auth/amazon/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Missing AMAZON_CLIENT_ID or AMAZON_CLIENT_SECRET in .env');
  process.exit(1);
}

// ── Print auth URL for first-time setup ───────────────────────────────────────

if (process.argv.includes('--auth-url')) {
  const authUrl = 'https://www.amazon.com/ap/oa?' + [
    'client_id=' + encodeURIComponent(CLIENT_ID),
    'scope=' + encodeURIComponent(SCOPE),
    'response_type=code',
    'redirect_uri=' + encodeURIComponent(REDIRECT_URI),
  ].join('&');
  console.log('\n📋 Open this URL in your browser to authorize:');
  console.log('\n' + authUrl + '\n');
  console.log('After authorizing, you will be redirected to:');
  console.log(REDIRECT_URI + '?code=<AUTH_CODE>');
  console.log('\nThen run:');
  console.log('  node scripts/pa-api-test.js --exchange-code <AUTH_CODE>\n');
  process.exit(0);
}

// ── Exchange auth code for tokens ─────────────────────────────────────────────

if (process.argv.includes('--exchange-code')) {
  const code = process.argv[process.argv.indexOf('--exchange-code') + 1];
  if (!code) { console.error('Usage: --exchange-code <CODE>'); process.exit(1); }
  exchangeCode(code).then((tokens) => {
    console.log('\n✅ Tokens received!');
    console.log('\nAdd to your .env:');
    console.log('AMAZON_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\nAccess token (expires in', tokens.expires_in, 'seconds):');
    console.log(tokens.access_token.slice(0, 40) + '...');
  }).catch((e) => { console.error('❌', e.message); process.exit(1); });
  return;
}

// ── Main test ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Testing Amazon Creators API v3.1 connection...');
  console.log('   Client ID:   ', CLIENT_ID.slice(0, 30) + '...');
  console.log('   Partner Tag: ', PARTNER_TAG);

  if (!REFRESH_TOKEN) {
    console.log('\n⚠️  No AMAZON_REFRESH_TOKEN in .env.');
    console.log('   Run: node scripts/pa-api-test.js --auth-url');
    console.log('   to complete the OAuth2 authorization flow first.\n');
    process.exit(1);
  }

  try {
    console.log('\n[1/2] Getting access token...');
    const token = await getAccessToken();
    console.log('   ✅ Access token received');

    console.log('\n[2/2] Searching for "standing desk"...');
    const results = await searchProducts(token, 'standing desk', 3);

    if (!results || results.length === 0) {
      console.log('   ⚠️  Connected but no results returned.');
      process.exit(0);
    }

    console.log(`\n✅ Creators API Connection successful!`);
    console.log(`   Found ${results.length} item(s)\n`);

    results.forEach((item, i) => {
      console.log(`   [${i + 1}] ${item.title || item.name || 'N/A'}`);
      console.log(`       ASIN:  ${item.asin}`);
      console.log(`       Price: ${item.price || 'N/A'}`);
      console.log(`       Image: ${item.image ? '✓' : '✗'}`);
    });
  } catch (e) {
    console.error('\n❌ API Error:', e.message);
    process.exit(1);
  }
}

// ── OAuth2 helpers ────────────────────────────────────────────────────────────

function post(hostname, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : new URLSearchParams(body).toString();
    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...extraHeaders,
      }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { reject(new Error('Invalid JSON: ' + d.slice(0, 100))); } });
    });
    req.on('error', reject);
    req.write(bodyStr); req.end();
  });
}

async function getAccessToken() {
  const { status, data } = await post('api.amazon.com', '/auth/o2/token', {
    grant_type: 'refresh_token',
    refresh_token: REFRESH_TOKEN,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  if (status !== 200 || !data.access_token) {
    throw new Error(`Token error (${status}): ${data.error_description || data.error || JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function exchangeCode(code) {
  const { status, data } = await post('api.amazon.com', '/auth/o2/token', {
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  if (status !== 200 || !data.access_token) {
    throw new Error(`Exchange error (${status}): ${data.error_description || data.error || JSON.stringify(data)}`);
  }
  return data;
}

// ── Creators API v3.1 product search ─────────────────────────────────────────

async function searchProducts(accessToken, keyword, count = 3) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ keyword, count: String(count) });
    const req = https.request({
      hostname: 'affiliate-program.amazon.com',
      path: '/v3.1/linker?' + params.toString(),
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Accept': 'application/json',
        'x-amzn-associate-tag': PARTNER_TAG,
      }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const body = JSON.parse(d);
          // Normalize response
          const items = body.items || body.results || body.products || body.Items || [];
          resolve(items.map(normalizeItem));
        } catch { reject(new Error('Parse error: ' + d.slice(0, 150))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function normalizeItem(item) {
  return {
    asin:  item.asin || item.ASIN || item.productId || '',
    title: item.title || item.name || item.ItemInfo?.Title?.DisplayValue || '',
    price: item.price || item.offers?.[0]?.price || '',
    image: item.image || item.imageUrl || item.Images?.Primary?.Large?.URL || null,
    link:  item.link  || item.url   || `https://www.amazon.com/dp/${item.asin}?tag=${PARTNER_TAG}`,
  };
}

main();
