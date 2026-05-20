#!/usr/bin/env node
/**
 * pa-api-test.js — Quick credentials test for Amazon PA-API 5.0
 *
 * Usage:
 *   AMAZON_ACCESS_KEY=xxx AMAZON_SECRET_KEY=xxx \
 *   AMAZON_PARTNER_TAG=xxx AMAZON_REGION=us-east-1 \
 *   node scripts/pa-api-test.js
 */

const ProductAdvertisingAPIv1 = require('paapi5-nodejs-sdk');

const accessKey    = process.env.AMAZON_ACCESS_KEY;
const secretKey    = process.env.AMAZON_SECRET_KEY;
const partnerTag   = process.env.AMAZON_PARTNER_TAG || 'compareelite-20';
const region       = process.env.AMAZON_REGION      || 'us-east-1';

if (!accessKey || !secretKey) {
  console.error('❌ Missing AMAZON_ACCESS_KEY or AMAZON_SECRET_KEY env vars.');
  process.exit(1);
}

const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
defaultClient.accessKey = accessKey;
defaultClient.secretKey = secretKey;
defaultClient.host       = region === 'us-east-1' ? 'webservices.amazon.com' : `webservices.amazon.${region.split('-').pop()}`;
defaultClient.region     = region;

const api = new ProductAdvertisingAPIv1.DefaultApi();

const searchRequest = new ProductAdvertisingAPIv1.SearchItemsRequest();
searchRequest.PartnerTag  = partnerTag;
searchRequest.PartnerType = 'Associates';
searchRequest.Keywords    = 'standing desk';
searchRequest.SearchIndex = 'All';
searchRequest.ItemCount   = 3;
searchRequest.Resources   = [
  'Images.Primary.Large',
  'ItemInfo.Title',
  'Offers.Listings.Price',
];

console.log('🔄 Testing Amazon PA-API 5.0 connection...');
console.log(`   Region:      ${region}`);
console.log(`   Partner Tag: ${partnerTag}`);
console.log(`   Access Key:  ${accessKey.slice(0, 8)}...`);

api.searchItems(searchRequest, (error, data) => {
  if (error) {
    console.error('\n❌ PA-API Error:', error.message || JSON.stringify(error));
    process.exit(1);
  }

  if (!data?.SearchResult?.Items?.length) {
    console.warn('⚠️  Connected but no items returned.');
    process.exit(0);
  }

  console.log(`\n✅ PA-API Connection successful!`);
  console.log(`   Found ${data.SearchResult.Items.length} items`);

  data.SearchResult.Items.forEach((item, i) => {
    const title = item.ItemInfo?.Title?.DisplayValue || 'N/A';
    const price = item.Offers?.Listings?.[0]?.Price?.DisplayAmount || 'N/A';
    const image = item.Images?.Primary?.Large?.URL ? '✓' : '✗';
    console.log(`\n   [${i + 1}] ${title}`);
    console.log(`       Price: ${price}  |  Image: ${image}  |  ASIN: ${item.ASIN}`);
  });
});
