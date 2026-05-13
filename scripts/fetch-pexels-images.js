#!/usr/bin/env node
/**
 * fetch-pexels-images.js
 *
 * Fetches hero + section images from the Pexels API and injects them into
 * an article JSON as `pexels_hero` and `pexels_sections`.
 *
 * Usage:
 *   node scripts/fetch-pexels-images.js --slug <slug>
 *
 * Requires env var:
 *   PEXELS_API_KEY=<your_key>
 *
 * Adds/updates these fields in the article JSON:
 *   pexels_hero: { id, url, photographer, photographer_url, alt }
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

const args = process.argv.slice(2);
const slugIdx = args.indexOf('--slug');
if (slugIdx === -1 || !args[slugIdx + 1]) {
  console.error('Usage: node scripts/fetch-pexels-images.js --slug <slug>');
  process.exit(1);
}
const slug = args[slugIdx + 1];
const articlePath = path.join(__dirname, '..', 'articles', `${slug}.json`);

if (!fs.existsSync(articlePath)) {
  console.error(`ERROR: Article not found: ${articlePath}`);
  process.exit(1);
}

const article = JSON.parse(fs.readFileSync(articlePath, 'utf8'));

function pexelsSearch(query, perPage = 1) {
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
        if (res.statusCode !== 200) {
          reject(new Error(`Pexels API returned HTTP ${res.statusCode}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse Pexels response: ${e.message}`));
        }
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

// Derive search queries from article content
function buildQueries(article) {
  // Hero: use article title stripped of "best" and year
  const heroQuery = article.title
    .replace(/\b(best|top|for|the|of|in|2025|2026)\b/gi, '')
    .trim();

  // Sections: use buying_guide section titles if available
  const sections = [];
  if (Array.isArray(article.buying_guide)) {
    for (const section of article.buying_guide.slice(0, 4)) {
      const title = section.title || section.heading || '';
      if (title) {
        sections.push({
          section: title,
          query: `${heroQuery} ${title}`.trim(),
        });
      }
    }
  }
  // Fallback if no buying_guide
  if (sections.length === 0) {
    sections.push({ section: 'lifestyle', query: heroQuery });
  }

  return { heroQuery, sections };
}

async function main() {
  console.log(`Fetching Pexels images for: ${slug}`);
  const { heroQuery, sections } = buildQueries(article);

  // Hero image
  console.log(`  Hero query: "${heroQuery}"`);
  let heroData;
  try {
    heroData = await pexelsSearch(heroQuery, 3);
  } catch (e) {
    console.error(`  ERROR fetching hero: ${e.message}`);
    process.exit(1);
  }
  const hero = pickPhoto(heroData);
  if (!hero) {
    console.error(`  No hero photo found for query: "${heroQuery}"`);
    process.exit(1);
  }
  console.log(`  Hero: ${hero.url} (by ${hero.photographer})`);

  // Section images
  const pexelsSections = [];
  for (const sec of sections) {
    console.log(`  Section "${sec.section}" query: "${sec.query}"`);
    try {
      const data = await pexelsSearch(sec.query, 2);
      const photo = pickPhoto(data);
      if (photo) {
        pexelsSections.push({ section: sec.section, ...photo });
        console.log(`    → ${photo.url} (by ${photo.photographer})`);
      } else {
        console.warn(`    → No photo found, skipping.`);
      }
    } catch (e) {
      console.warn(`    → ERROR: ${e.message} — skipping section.`);
    }
    // Small delay to respect Pexels rate limit (200 req/hour on free tier)
    await new Promise((r) => setTimeout(r, 200));
  }

  // Inject into article
  article.pexels_hero = hero;
  article.pexels_sections = pexelsSections;

  fs.writeFileSync(articlePath, JSON.stringify(article, null, 2) + '\n');
  console.log(`\nDone. Injected pexels_hero + ${pexelsSections.length} pexels_sections into ${slug}.json`);
}

main().catch((e) => {
  console.error('Unhandled error:', e.message);
  process.exit(1);
});
