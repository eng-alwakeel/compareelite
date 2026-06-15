#!/usr/bin/env node
/**
 * Backfills related_articles for articles that have an empty [] or are missing the field.
 * Picks 3 same-category slugs using token-overlap scoring (deterministic, reproducible).
 *
 * Usage:
 *   node scripts/backfill-related-articles.js [--dry-run] [--sample N]
 *
 * --dry-run  : print what would change without writing files
 * --sample N : only process the first N articles that need updating (for preview)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'articles-manifest.json');
const ARTICLES_DIR = path.join(ROOT, 'articles');

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const sampleIdx = argv.indexOf('--sample');
const SAMPLE_LIMIT = sampleIdx !== -1 ? parseInt(argv[sampleIdx + 1], 10) : Infinity;

// Stop-words for token-overlap scoring
const STOP_WORDS = new Set(['best', 'of', 'the', 'for', 'under', '2026', 'with', 'a', 'an',
  'and', 'or', 'in', 'on', 'at', 'to', 'from', 'by', 'top', 'most', 'our']);

function tokenise(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function overlapScore(tokensA, tokensB) {
  const setB = new Set(tokensB);
  return tokensA.filter(t => setB.has(t)).length;
}

function readArticle(slug) {
  const fp = path.join(ARTICLES_DIR, `${slug}.json`);
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (_) {
    return null;
  }
}

function needsBackfill(article) {
  if (!article.related_articles) return true;
  if (!Array.isArray(article.related_articles)) return true;
  // Has fewer than 3 entries
  const valid = article.related_articles.filter(r => r && r.slug);
  return valid.length < 3;
}

function pickRelated(slug, article, categoryBuckets, manifestSlugs) {
  const category = article.category;
  const titleTokens = tokenise(article.title || slug);

  // Build candidate pool: same category first, then adjacent
  const adjacent = { 'Tech': 'Smart Home', 'Smart Home': 'Tech', 'Home Office': 'Home Fitness', 'Home Fitness': 'Home Office' };
  let candidates = (categoryBuckets[category] || []).filter(s => s !== slug);

  if (candidates.length < 3) {
    const adj = adjacent[category];
    if (adj) {
      candidates = [...candidates, ...(categoryBuckets[adj] || []).filter(s => s !== slug)];
    }
  }

  // Score by token overlap, tie-break alphabetically (deterministic)
  const scored = candidates.map(s => {
    const art = readArticle(s);
    const tokens = tokenise(art ? (art.title || s) : s);
    return { slug: s, score: overlapScore(titleTokens, tokens), title: art ? art.title : s };
  });

  scored.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

  // Take top 3, manifest-existence verified
  const picked = [];
  for (const c of scored) {
    if (picked.length >= 3) break;
    if (!manifestSlugs.has(c.slug)) continue; // guard: must be in manifest
    picked.push({ slug: c.slug, title: c.title });
  }

  return picked;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const manifestSlugs = new Set(manifest.slugs);

  // Build category buckets from manifest slugs
  const categoryBuckets = {};
  for (const slug of manifest.slugs) {
    const art = readArticle(slug);
    if (!art) continue;
    const cat = art.category || 'Unknown';
    if (!categoryBuckets[cat]) categoryBuckets[cat] = [];
    categoryBuckets[cat].push(slug);
  }

  let totalNeedUpdate = 0;
  let totalAlreadyOk = 0;
  let totalUpdated = 0;
  let sampleCount = 0;

  const results = [];

  for (const slug of manifest.slugs) {
    const article = readArticle(slug);
    if (!article) continue;

    if (!needsBackfill(article)) {
      totalAlreadyOk++;
      continue;
    }

    totalNeedUpdate++;
    const picked = pickRelated(slug, article, categoryBuckets, manifestSlugs);

    if (picked.length === 0) {
      console.log(`[SKIP] ${slug} — no candidates found`);
      continue;
    }

    results.push({ slug, category: article.category, picked });

    if (sampleCount < SAMPLE_LIMIT) {
      sampleCount++;
      console.log(`\n[${DRY_RUN ? 'DRY-RUN' : 'UPDATE'}] ${slug} (${article.category})`);
      console.log(`  related_articles:`);
      for (const r of picked) {
        console.log(`    - ${r.slug}`);
        console.log(`      "${r.title}"`);
      }
    }

    if (!DRY_RUN) {
      article.related_articles = picked;
      fs.writeFileSync(
        path.join(ARTICLES_DIR, `${slug}.json`),
        JSON.stringify(article, null, 2) + '\n'
      );
      totalUpdated++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Manifest slugs:      ${manifest.slugs.length}`);
  console.log(`Already OK (≥3):     ${totalAlreadyOk}`);
  console.log(`Need backfill:       ${totalNeedUpdate}`);
  if (DRY_RUN) {
    console.log(`Would update:        ${results.length} articles`);
    console.log(`Mode:                DRY-RUN (no files written)`);
  } else {
    console.log(`Updated:             ${totalUpdated} articles`);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main();
