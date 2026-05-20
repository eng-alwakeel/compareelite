#!/usr/bin/env node
/**
 * replace-dead-asins.js
 *
 * 1. Reads dead ASINs from the existing amazon-links-cache.json (status 404)
 * 2. Maps each dead ASIN to its article(s)
 * 3. Searches Amazon for a live replacement in the same niche
 * 4. Rewrites the article JSON with the replacement
 * 5. Saves data/dead-asin-report.json with full details
 *
 * Usage:
 *   node scripts/replace-dead-asins.js               # all articles
 *   node scripts/replace-dead-asins.js --slug <slug>  # one article
 *   node scripts/replace-dead-asins.js --dry-run      # report only, no writes
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

const ROOT         = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const CACHE_FILE   = path.join(ROOT, 'data', 'amazon-links-cache.json');
const REPORT_PATH  = path.join(ROOT, 'data', 'dead-asin-report.json');
const PARTNER_TAG  = process.env.AMAZON_PARTNER_TAG || 'compareelite-20';

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0';
const HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'identity',
  Connection: 'close',
};
const TIMEOUT_MS  = 14000;
const DELAY_MS    = 600;

const NOT_FOUND_MARKERS = [
  "Looking for something?",
  "We're sorry. The Web address you entered",
  "Sorry! We couldn't find that page",
  "Page Not Found",
  "doesn't exist anymore",
  "currently unavailable",
];
const CAPTCHA_MARKERS = [
  "validateCaptcha",
  "opfcaptcha.amazon.com",
  "Robot Check",
  "Click the button below to continue",
];

// ── HTTP ──────────────────────────────────────────────────────────────────────

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const req = https.get(url, { headers: HEADERS, timeout: TIMEOUT_MS }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return resolve(get(res.headers.location, redirects + 1));
      }
      const status = res.statusCode;
      let body = '';
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve({ status, body }); } };
      res.on('data', (c) => {
        body += c;
        if (body.length > 120000) { res.destroy(); finish(); }
      });
      res.on('end', finish);
      res.on('close', finish);
      res.on('error', (e) => { if (!settled) { settled = true; reject(e); } });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    req.on('error', (e) => reject(e));
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function getWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await get(url);
      if (res.status === 500 || res.status === 503) {
        if (attempt < retries) { await sleep(2000 * attempt); continue; }
      }
      return res;
    } catch (e) {
      if (attempt < retries) { await sleep(2000 * attempt); continue; }
      throw e;
    }
  }
}

// ── Classify a live probe ─────────────────────────────────────────────────────

function classify(status, body) {
  if (status === 404 || status === 410) return 'DEAD';
  if (NOT_FOUND_MARKERS.some((m) => body.includes(m))) return 'DEAD';
  if (CAPTCHA_MARKERS.some((m) => body.includes(m))) return 'BLOCKED';
  if (status === 200) return 'OK';
  return 'BLOCKED';
}

async function probeAsin(asin) {
  try {
    const { status, body } = await getWithRetry(`https://www.amazon.com/dp/${asin}`);
    return classify(status, body);
  } catch (e) {
    return 'BLOCKED';
  }
}

// ── Extract related ASINs from a product page ─────────────────────────────────
// Product pages work without bot challenges; search pages do not from VPS.

async function getRelatedAsins(seedAsin, excludeAsins = new Set()) {
  try {
    const { status, body } = await getWithRetry(`https://www.amazon.com/dp/${seedAsin}`);
    if (status !== 200) return [];
    const seen = new Set();
    const candidates = [];
    for (const m of body.matchAll(/\/dp\/([A-Z0-9]{10})/g)) {
      const a = m[1];
      if (!seen.has(a) && a !== seedAsin && !excludeAsins.has(a)) {
        seen.add(a); candidates.push(a);
      }
    }
    return candidates.slice(0, 20);
  } catch {
    return [];
  }
}

async function findReplacement(deadAsin, siblingsAlive, allDeadSet, crossCategorySeeds = []) {
  // Strategy 1: use alive siblings from same article as seeds
  // Strategy 2: cross-article seeds from same category (when all siblings dead)
  // Strategy 3: load dead ASIN page (may still show "also viewed" links)
  const allSeeds = [...siblingsAlive.filter((a) => a !== deadAsin), ...crossCategorySeeds];

  for (const seed of allSeeds) {
    await sleep(DELAY_MS);
    const candidates = await getRelatedAsins(seed, allDeadSet);
    for (const candidate of candidates) {
      await sleep(300);
      const liveness = await probeAsin(candidate);
      if (liveness === 'OK' || liveness === 'BLOCKED') {
        return { asin: candidate, liveness };
      }
    }
  }

  // Strategy 3: the dead ASIN's page may still show alternatives (cached/archived)
  await sleep(DELAY_MS);
  const altCandidates = await getRelatedAsins(deadAsin, allDeadSet);
  for (const candidate of altCandidates) {
    await sleep(300);
    const liveness = await probeAsin(candidate);
    if (liveness === 'OK' || liveness === 'BLOCKED') {
      return { asin: candidate, liveness };
    }
  }

  return null;
}


// ── Load dead ASINs from cache ────────────────────────────────────────────────

function loadDeadAsins() {
  const raw   = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  const cache = raw.cache || {};
  const dead  = new Set();
  for (const [asin, entry] of Object.entries(cache)) {
    if (entry.result?.status === 404) dead.add(asin);
  }
  return dead;
}

// ── Extract ASIN from product (supports both schemas) ─────────────────────────

const ASIN_RE = /\/dp\/([A-Z0-9]{10})/;

function getAsin(product) {
  if (product.asin) return product.asin;
  if (product.link) { const m = product.link.match(ASIN_RE); if (m) return m[1]; }
  return null;
}

function setAsin(product, newAsin, newImage, newPrice) {
  if (product.asin !== undefined) product.asin = newAsin;
  product.link = `https://www.amazon.com/dp/${newAsin}?tag=${PARTNER_TAG}`;
  if (newImage) product.image = newImage;
  if (newPrice && newPrice !== 'N/A') product.price = newPrice;
}

// ── Build article→products map ────────────────────────────────────────────────

function loadArticles(slugFilter) {
  const files = fs.readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'TEMPLATE.json');
  const articles = [];
  for (const f of files) {
    const slug = f.replace('.json', '');
    if (slugFilter && slug !== slugFilter) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf8'));
      articles.push({ slug, filePath: path.join(ARTICLES_DIR, f), data });
    } catch { /* skip malformed */ }
  }
  return articles;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const dryRun  = args.includes('--dry-run');
  const slugIdx = args.indexOf('--slug');
  const single  = slugIdx !== -1 ? args[slugIdx + 1] : null;

  if (dryRun) console.log('DRY RUN — no files will be modified\n');

  const deadSet     = loadDeadAsins();
  const allArticles = loadArticles(null);  // always load all for cross-article seeds
  const articles    = single ? allArticles.filter((a) => a.slug === single) : allArticles;

  console.log(`Dead ASINs in cache: ${deadSet.size}`);
  console.log(`Articles to scan:    ${articles.length}\n`);

  // Build category → alive ASINs map for cross-article seeding
  const categorySeeds = {};
  for (const { data } of allArticles) {
    const cat = data.category || 'Unknown';
    if (!categorySeeds[cat]) categorySeeds[cat] = [];
    for (const p of data.products || []) {
      const a = getAsin(p);
      if (a && !deadSet.has(a) && categorySeeds[cat].length < 10) {
        categorySeeds[cat].push(a);
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    articles: {},
    summary: { totalDead: 0, replaced: 0, stillBroken: 0 },
  };

  for (let i = 0; i < articles.length; i++) {
    const { slug, filePath, data } = articles[i];
    const products = data.products || [];
    const deadProducts = products.filter((p) => { const a = getAsin(p); return a && deadSet.has(a); });

    if (deadProducts.length === 0) continue;

    console.log(`[${i + 1}/${articles.length}] ${slug} — ${deadProducts.length} dead ASIN(s)`);
    const articleResults = [];

    // Collect alive sibling ASINs (same article), then cross-article seeds (same category)
    const siblingsAlive = products
      .map((p) => getAsin(p))
      .filter((a) => a && !deadSet.has(a));

    const category = data.category || 'Unknown';
    const crossSeeds = siblingsAlive.length === 0
      ? (categorySeeds[category] || []).slice(0, 5)
      : [];

    if (crossSeeds.length > 0) {
      console.log(`  (all siblings dead — using ${crossSeeds.length} cross-article seeds from "${category}")`);
    }

    const usedReplacements = new Set();

    for (const product of deadProducts) {
      const oldAsin = getAsin(product);
      report.summary.totalDead++;

      process.stdout.write(`  ↳ ${oldAsin} → finding replacement ... `);

      // Extend dead set with already-used replacements to avoid duplicates
      const exclusions = new Set([...deadSet, ...usedReplacements]);

      await sleep(DELAY_MS);
      const candidate = await findReplacement(oldAsin, siblingsAlive, exclusions, crossSeeds);

      if (!candidate) {
        console.log('no replacement found');
        report.summary.stillBroken++;
        articleResults.push({ asin: oldAsin, status: 'DEAD', replaced: false, reason: 'no_candidate' });
        continue;
      }

      const tag = candidate.liveness === 'BLOCKED' ? '(BLOCKED/assumed OK)' : '✓';
      console.log(`→ ${candidate.asin} ${tag}`);

      if (!dryRun) {
        setAsin(product, candidate.asin, null, null);
      }

      usedReplacements.add(candidate.asin);
      report.summary.replaced++;
      articleResults.push({
        asin: oldAsin, status: 'DEAD', replaced: !dryRun,
        newAsin: candidate.asin, candidateLiveness: candidate.liveness,
      });
    }

    if (!dryRun && articleResults.some((r) => r.replaced)) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    }

    report.articles[slug] = articleResults;
    await sleep(300);
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

  console.log('\n──────────────────────────────────────');
  console.log(`  Total dead ASINs found:  ${report.summary.totalDead}`);
  console.log(`  Successfully replaced:   ${report.summary.replaced}`);
  console.log(`  Still broken:            ${report.summary.stillBroken}`);
  console.log(`  Report saved:            data/dead-asin-report.json`);
  console.log('──────────────────────────────────────\n');

  process.exit(report.summary.stillBroken > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
