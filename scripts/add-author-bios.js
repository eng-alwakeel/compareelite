#!/usr/bin/env node
// add-author-bios.js — adds author fields to all article JSON files missing them

const fs = require('fs');
const path = require('path');
const glob = require('glob') || null;

const ARTICLES_DIR = path.join(__dirname, '..', 'articles');
const AUTHOR_DATA = {
  author: "CompareElite Editorial Team",
  author_bio: "Our editorial team researches and tests products across Tech, Home Office, Smart Home, and Fitness categories to deliver honest, unbiased buying guides.",
  author_url: "https://compareelite.com/about"
};

let files;
try {
  files = fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(ARTICLES_DIR, f));
} catch (e) {
  console.error('Could not read articles directory:', e.message);
  process.exit(1);
}

let updated = 0;
let skipped = 0;
let errors = 0;

for (const fp of files) {
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    const data = JSON.parse(raw);

    if (data.author || data.author_name || data.by) {
      skipped++;
      continue;
    }

    // Inject author fields
    const updated_data = Object.assign({}, data, AUTHOR_DATA);
    fs.writeFileSync(fp, JSON.stringify(updated_data, null, 2), 'utf8');
    updated++;
    console.log(`Updated: ${path.basename(fp)}`);
  } catch (e) {
    console.error(`Error processing ${fp}: ${e.message}`);
    errors++;
  }
}

console.log(`\nDone. Updated: ${updated} | Skipped (already had author): ${skipped} | Errors: ${errors}`);
