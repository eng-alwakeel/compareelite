#!/usr/bin/env node
'use strict';

require('dotenv').config();

const https = require('https');

const CLIENT_ID     = process.env.AMAZON_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;
const PARTNER_TAG   = process.env.AMAZON_PARTNER_TAG || 'compareelite-20';
const MARKETPLACE   = 'www.amazon.com';
const SCOPE         = 'creatorsapi::default';
const API_HOST      = 'creatorsapi.amazon';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Missing AMAZON_CLIENT_ID or AMAZON_CLIENT_SECRET in .env');
  process.exit(1);
}

function post(hostname, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(body);
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': bodyBuf.length,
        ...extraHeaders,
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw), raw }); }
        catch { resolve({ status: res.statusCode, data: null, raw }); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function getToken() {
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         SCOPE,
  }).toString();

  return post('api.amazon.com', '/auth/o2/token', body);
}

async function searchItems(token, keywords) {
  const payload = JSON.stringify({
    keywords,
    partnerTag: PARTNER_TAG,
    resources: [
      'images.primary.large',
      'itemInfo.title',
      'itemInfo.byLineInfo',
      'offersV2.listings.price',
      'customerReviews.starRating',
      'customerReviews.count',
    ],
    itemCount: 3,
  });

  return post(API_HOST, '/catalog/v1/searchItems', payload, {
    'Authorization': 'Bearer ' + token,
    'Content-Type':  'application/json',
    'x-marketplace': MARKETPLACE,
  });
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Amazon Creators API v3.1 — Connection Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Client ID:   ', CLIENT_ID.slice(0, 40) + '...');
  console.log('  Partner Tag: ', PARTNER_TAG);
  console.log('  Scope:       ', SCOPE);
  console.log('');

  // ── Step 1: Get token ──────────────────────────────────────────────────────
  process.stdout.write('[1/2] Getting access token ... ');
  let token;
  try {
    const { status, data, raw } = await getToken();
    if (status === 200 && data?.access_token) {
      token = data.access_token;
      console.log('✅ OK (expires in', data.expires_in, 's)');
      console.log('     Token:', token.slice(0, 30) + '...');
    } else {
      console.log('❌ FAILED');
      console.log('   Status:', status);
      console.log('   Error: ', data?.error || '—');
      console.log('   Desc:  ', data?.error_description || raw?.slice(0, 200));
      process.exit(1);
    }
  } catch (e) {
    console.log('❌ NETWORK ERROR:', e.message);
    process.exit(1);
  }

  // ── Step 2: Search items ───────────────────────────────────────────────────
  console.log('');
  process.stdout.write('[2/2] Searching "standing desk" ... ');
  try {
    const { status, data, raw } = await searchItems(token, 'standing desk');
    if (status === 200) {
      const items = data?.SearchResult?.Items || data?.searchResult?.items || [];
      console.log(`✅ OK — ${items.length} item(s) returned`);

      if (items.length > 0) {
        console.log('\n📦 First item (full JSON):');
        console.log(JSON.stringify(items[0], null, 2));
      } else {
        console.log('\n⚠️  Connected but no items returned. Full response:');
        console.log(JSON.stringify(data, null, 2).slice(0, 800));
      }
    } else {
      console.log('❌ FAILED');
      console.log('   Status:', status);
      console.log('   Body:  ', raw?.slice(0, 500) || JSON.stringify(data).slice(0, 500));
      process.exit(1);
    }
  } catch (e) {
    console.log('❌ NETWORK ERROR:', e.message);
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  All tests passed ✅');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
