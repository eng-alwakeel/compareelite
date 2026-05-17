#!/usr/bin/env node
/**
 * fetch-pexels-images.js
 *
 * Fetches hero + section images from the Pexels API and injects them into
 * article JSON files as `pexels_hero` and `pexels_sections`.
 *
 * Usage:
 *   node scripts/fetch-pexels-images.js --slug <slug>   # single article
 *   node scripts/fetch-pexels-images.js --new           # articles missing pexels_hero
 *   node scripts/fetch-pexels-images.js                 # all 186 articles
 *
 * Requires env var:
 *   PEXELS_API_KEY=<your_key>
 *
 * Adds/updates these fields in each article JSON:
 *   pexels_hero:     { id, url, photographer, photographer_url, alt }
 *   pexels_sections: [{ section, id, url, photographer, photographer_url, alt }, ...]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.PEXELS_API_KEY;
if (!API_KEY) {
  console.error('ERROR: PEXELS_API_KEY env var is not set.');
  process.exit(1);
}

const ARTICLES_DIR = path.join(__dirname, '..', 'articles');
const args = process.argv.slice(2);
const modeNew  = args.includes('--new');
const slugIdx  = args.indexOf('--slug');
const singleSlug = slugIdx !== -1 ? args[slugIdx + 1] : null;

if (singleSlug && !singleSlug) {
  console.error('Usage: node scripts/fetch-pexels-images.js --slug <slug>');
  process.exit(1);
}

// ------- Helpers -------

function pexelsSearch(query, perPage = 3) {
  return new Promise((resolve, reject) => {
    const q = encodeURIComponent(query);
    const options = {
      hostname: 'api.pexels.com',
      path: `/v1/search?query=${q}&per_page=${perPage}&orientation=landscape`,
      headers: { Authorization: API_KEY },
    };
    https.get(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 429) {
          reject(new Error('RATE_LIMITED'));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 120)}`));
          return;
        }
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`Parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function pickPhoto(data) {
  if (!data.photos || data.photos.length === 0) return null;
  const p = data.photos[0];
  return {
    id: p.id,
    url: p.src.large2x || p.src.large,
    photographer: p.photographer,
    photographer_url: p.photographer_url,
    alt: p.alt || '',
  };
}

function buildQueries(article) {
  const heroQuery = article.title
    .replace(/\b(best|top|for|the|of|in|2025|2026)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sections = [];
  if (Array.isArray(article.buying_guide)) {
    for (const section of article.buying_guide.slice(0, 4)) {
      const title = section.title || section.heading || '';
      if (title) sections.push({ section: title, query: `${heroQuery} ${title}`.trim() });
    }
  }
  if (sections.length === 0) {
    sections.push({ section: 'lifestyle', query: heroQuery });
  }
  return { heroQuery, sections };
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function processArticle(slug) {
  const articlePath = path.join(ARTICLES_DIR, `${slug}.json`);
  if (!fs.existsSync(articlePath)) {
    console.error(`  ERROR: Not found — ${articlePath}`);
    return false;
  }

  const article = JSON.parse(fs.readFileSync(articlePath, 'utf8'));
  const { heroQuery, sections } = buildQueries(article);

  let heroData;
  try {
    heroData = await pexelsSearch(heroQuery);
  } catch (e) {
    if (e.message === 'RATE_LIMITED') {
      console.warn(`  RATE_LIMITED on hero — waiting 30s...`);
      await delay(30000);
      heroData = await pexelsSearch(heroQuery);
    } else {
      console.error(`  ERROR hero fetch: ${e.message}`);
      return false;
    }
  }

  const hero = pickPhoto(heroData);
  if (!hero) {
    console.warn(`  No hero photo for "${heroQuery}" — skipping.`);
    return false;
  }

  const pexelsSections = [];
  for (const sec of sections) {
    await delay(250); // respect 200 req/hour free-tier rate limit
    try {
      const data = await pexelsSearch(sec.query, 2);
      const photo = pickPhoto(data);
      if (photo) pexelsSections.push({ section: sec.section, ...photo });
    } catch (e) {
      if (e.message === 'RATE_LIMITED') {
        console.warn(`  RATE_LIMITED on section "${sec.section}" — skipping.`);
      } else {
        console.warn(`  Section "${sec.section}" error: ${e.message}`);
      }
    }
  }

  article.pexels_hero = hero;
  article.pexels_sections = pexelsSections;
  fs.writeFileSync(articlePath, JSON.stringify(article, null, 2) + '\n');
  console.log(`  ✓ hero=${hero.id}  sections=${pexelsSections.length}`);
  return true;
}

// ------- Entry -------

async function main() {
  let slugs;

  if (singleSlug) {
    slugs = [singleSlug];
  } else {
    const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.json'));
    slugs = files.map((f) => f.replace('.json', ''));

    if (modeNew) {
      // Only articles that don't yet have pexels_hero
      slugs = slugs.filter((slug) => {
        const articlePath = path.join(ARTICLES_DIR, `${slug}.json`);
        try {
          const a = JSON.parse(fs.readFileSync(articlePath, 'utf8'));
          return !a.pexels_hero;
        } catch { return true; }
      });
      console.log(`Mode: --new  (${slugs.length} articles without pexels_hero)`);
    } else {
      console.log(`Mode: all  (${slugs.length} articles)`);
    }
  }

  let ok = 0, fail = 0;
  for (const slug of slugs) {
    console.log(`[${ok + fail + 1}/${slugs.length}] ${slug}`);
    const success = await processArticle(slug);
    if (success) ok++; else fail++;
    await delay(300); // extra buffer between articles
  }

  console.log(`\nDone — OK: ${ok}  Failed: ${fail}`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Unhandled error:', e.message);
  process.exit(1);
});
