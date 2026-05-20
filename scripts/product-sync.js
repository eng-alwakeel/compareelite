#!/usr/bin/env node
/**
 * product-sync.js — Fetch live products from Amazon PA-API 5.0
 *                   and save to data/pa-api-products.json
 *
 * Usage:
 *   node scripts/product-sync.js
 */

const paApiClient = require('../lib/pa-api-client');
const fs   = require('fs');
const path = require('path');

const KEYWORDS = [
  'best standing desk',
  'gaming headphones',
  'ergonomic office chair',
  'ergonomic keyboard',
  'monitor arm desk mount',
  'wireless mouse',
  'laptop stand',
  'webcam for streaming',
  'mechanical keyboard',
  'ultrawide monitor',
];

const DELAY_MS = 1100; // PA-API rate limit: ~1 req/sec

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function syncProducts() {
  console.log('🔄 Starting PA-API product sync...');
  console.log(`   Keywords: ${KEYWORDS.length}`);

  const allProducts = [];
  const seenAsins   = new Set();

  for (let i = 0; i < KEYWORDS.length; i++) {
    const keyword = KEYWORDS[i];
    console.log(`\n[${i + 1}/${KEYWORDS.length}] Fetching: "${keyword}"`);

    try {
      const results = await paApiClient.searchProducts(keyword, 'All', 6);
      let added = 0;
      for (const product of results) {
        if (!seenAsins.has(product.asin)) {
          seenAsins.add(product.asin);
          allProducts.push({ ...product, keyword });
          added++;
        }
      }
      console.log(`   → ${results.length} results, ${added} new (${seenAsins.size} total unique)`);
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }

    if (i < KEYWORDS.length - 1) await sleep(DELAY_MS);
  }

  const outputPath = path.join(__dirname, '../data/pa-api-products.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: allProducts.length,
    products: allProducts,
  }, null, 2));

  console.log(`\n✅ Synced ${allProducts.length} unique products → data/pa-api-products.json`);
}

syncProducts().catch((err) => {
  console.error('Unhandled error:', err.message);
  process.exit(1);
});
