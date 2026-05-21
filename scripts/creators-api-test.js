#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { ApiClient, DefaultApi, SearchItemsRequestContent } = require('creatorsapi-nodejs-sdk');

const CLIENT_ID     = process.env.AMAZON_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;
const PARTNER_TAG   = process.env.AMAZON_PARTNER_TAG || 'compareelite-20';
const MARKETPLACE   = 'www.amazon.com';
const VERSION       = '3.1';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Missing AMAZON_CLIENT_ID or AMAZON_CLIENT_SECRET in .env');
  process.exit(1);
}

async function test() {
  console.log('🔄 Testing Amazon Creators API v3.1...');
  console.log('   Client ID:   ', CLIENT_ID.slice(0, 35) + '...');
  console.log('   Partner Tag: ', PARTNER_TAG);
  console.log('   Version:     ', VERSION);
  console.log('   Marketplace: ', MARKETPLACE);
  console.log('');

  try {
    const apiClient = new ApiClient();
    apiClient.credentialId     = CLIENT_ID;
    apiClient.credentialSecret = CLIENT_SECRET;
    apiClient.version          = VERSION;
    apiClient.marketplace      = MARKETPLACE;

    const api = new DefaultApi(apiClient);

    const requestContent = new SearchItemsRequestContent();
    requestContent.keywords   = 'standing desk';
    requestContent.partnerTag = PARTNER_TAG;
    requestContent.resources  = [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'Offers.Listings.Price',
    ];

    console.log('[1/1] Searching for "standing desk"...');
    const result = await api.searchItems(MARKETPLACE, {
      searchItemsRequestContent: requestContent,
    });

    const items = result?.SearchResult?.Items || result?.searchResult?.items || [];

    if (!items.length) {
      console.log('⚠️  Connected but no items returned. Raw response:');
      console.log(JSON.stringify(result, null, 2).slice(0, 500));
      process.exit(0);
    }

    console.log(`\n✅ Creators API connection successful!`);
    console.log(`   Found ${items.length} item(s)\n`);

    items.slice(0, 3).forEach((item, i) => {
      const title = item?.ItemInfo?.Title?.DisplayValue || item?.title || 'N/A';
      const asin  = item?.ASIN || item?.asin || 'N/A';
      const price = item?.Offers?.Listings?.[0]?.Price?.DisplayAmount || 'N/A';
      const image = item?.Images?.Primary?.Large?.URL ? '✓' : '✗';
      console.log(`   [${i + 1}] ${title}`);
      console.log(`       ASIN:  ${asin}`);
      console.log(`       Price: ${price}`);
      console.log(`       Image: ${image}`);
    });

    console.log('\n📦 First item (full):');
    console.log(JSON.stringify(items[0], null, 2));

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.response) {
      console.error('   Status:', err.status || err.response?.status);
      console.error('   Body:  ', JSON.stringify(err.response?.body || err.response?.text || '').slice(0, 300));
    }
    process.exit(1);
  }
}

test();
