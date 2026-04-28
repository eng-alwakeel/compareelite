#!/usr/bin/env node
/**
 * CompareElite health metrics collector.
 *
 * Runs at every CEO heartbeat. Computes a snapshot of every health
 * dimension we care about (validator pass rate, dead ASINs, image
 * issues, excerpt drift, etc.) and appends it to
 * data/health-history.json — the time series that detect-patterns.js
 * reads to find recurring problems.
 *
 *   node scripts/health-metrics.js              # append a new snapshot
 *   node scripts/health-metrics.js --print      # don't append, just print
 *   node scripts/health-metrics.js --slim       # print 1-line summary
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const BROKEN_LINKS = path.join(ROOT, 'data', 'broken-amazon-links.json');
const HISTORY_PATH = path.join(ROOT, 'data', 'health-history.json');
const VALID_CATEGORIES = ['Tech', 'Home Office', 'Smart Home', 'Home Fitness'];
const AMAZON_CDN   = 'https://m.media-amazon.com/images/I/';
const AMAZON_CDN_NA = 'https://images-na.ssl-images-amazon.com/images/';
function isAmazonCdnImage(url) {
  return url && (url.startsWith(AMAZON_CDN) || url.startsWith(AMAZON_CDN_NA));
}

const { validateArticle } = require('./validate-article');

function loadArticles() {
  const out = [];
  for (const f of fs.readdirSync(ARTICLES_DIR)) {
    if (!f.endsWith('.json') || f === 'TEMPLATE.json') continue;
    const fp = path.join(ARTICLES_DIR, f);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      out.push({ slug: data.slug || f.replace('.json', ''), filePath: fp, data });
    } catch (err) {
      out.push({ slug: f.replace('.json', ''), filePath: fp, data: null, parseError: err.message });
    }
  }
  return out;
}

function loadBrokenLinks() {
  try {
    const d = JSON.parse(fs.readFileSync(BROKEN_LINKS, 'utf8'));
    const dead = new Set();
    for (const r of d.results || []) if (r.state === 'DEAD' && r.asin) dead.add(r.asin);
    return { generatedAt: d.generatedAt, summary: d.summary, deadAsins: dead };
  } catch {
    return { generatedAt: null, summary: { OK: 0, DEAD: 0, BLOCKED: 0, ERROR: 0 }, deadAsins: new Set() };
  }
}

function asin(link) {
  const m = (link || '').match(/\/dp\/([A-Z0-9]{10})/);
  return m ? m[1] : null;
}

function collect() {
  const today = new Date().toISOString().slice(0, 10);
  const articles = loadArticles();
  const broken = loadBrokenLinks();

  const m = {
    timestamp: new Date().toISOString(),
    articles: {
      total: articles.length,
      jsonValid: 0,
      jsonBroken: [],
      byCategory: Object.fromEntries(VALID_CATEGORIES.map((c) => [c, 0])),
      addedToday: 0,
    },
    validator: { pass: 0, fail: 0, failReasons: {} },
    asins: {
      totalProducts: 0,
      dead: [],
      deadByCategory: Object.fromEntries(VALID_CATEGORIES.map((c) => [c, 0])),
      deadByArticle: {},
    },
    images: {
      productsWithBadCdn: [],
      productsWithBadCdnByCategory: Object.fromEntries(VALID_CATEGORIES.map((c) => [c, 0])),
      thumbnailsNotMatchingProduct0: [],
    },
    excerpts: {
      offRange: [],
    },
    faq: {
      shortAnswers: 0,
      missingNumber: 0,
    },
    brokenLinksReport: {
      generatedAt: broken.generatedAt,
      summary: broken.summary,
    },
  };

  for (const a of articles) {
    if (!a.data) {
      m.articles.jsonBroken.push(a.slug);
      continue;
    }
    m.articles.jsonValid++;
    const cat = a.data.category;
    if (cat in m.articles.byCategory) m.articles.byCategory[cat]++;
    if (a.data.date === today) m.articles.addedToday++;

    const errs = validateArticle(a.data, a.filePath);
    if (errs.length === 0) m.validator.pass++;
    else {
      m.validator.fail++;
      for (const e of errs) {
        const key = e.replace(/products\[\d+\]/g, 'products[N]')
                     .replace(/buying_guide\[\d+\]/g, 'buying_guide[N]')
                     .replace(/faq\[\d+\]/g, 'faq[N]')
                     .replace(/ASIN [A-Z0-9]{10}/g, 'ASIN <X>')
                     .slice(0, 200);
        m.validator.failReasons[key] = (m.validator.failReasons[key] || 0) + 1;
      }
    }

    for (const p of a.data.products || []) {
      m.asins.totalProducts++;
      const asinCode = asin(p.link);
      if (asinCode && broken.deadAsins.has(asinCode)) {
        m.asins.dead.push({ slug: a.slug, asin: asinCode, category: cat });
        if (cat in m.asins.deadByCategory) m.asins.deadByCategory[cat]++;
        m.asins.deadByArticle[a.slug] = (m.asins.deadByArticle[a.slug] || 0) + 1;
      }
      if (p.image && !isAmazonCdnImage(p.image)) {
        m.images.productsWithBadCdn.push({ slug: a.slug, image: p.image.slice(0, 80) });
        if (cat in m.images.productsWithBadCdnByCategory) m.images.productsWithBadCdnByCategory[cat]++;
      }
    }

    if (a.data.thumbnail && a.data.products && a.data.products[0] && a.data.products[0].image) {
      if (a.data.thumbnail !== a.data.products[0].image) {
        m.images.thumbnailsNotMatchingProduct0.push(a.slug);
      }
    }

    const e = (a.data.excerpt || '').length;
    if (e < 150 || e > 160) m.excerpts.offRange.push({ slug: a.slug, length: e });

    for (let i = 0; i < (a.data.faq || []).length; i++) {
      const ans = a.data.faq[i].a || '';
      const wc = ans.split(/\s+/).filter(Boolean).length;
      if (wc < 80 || wc > 105) m.faq.shortAnswers++;
      if (!/\d/.test(ans)) m.faq.missingNumber++;
    }
  }

  m.validator.passRate = articles.length === 0 ? 0 : +(m.validator.pass / articles.length * 100).toFixed(1);
  m.asins.deadRate = m.asins.totalProducts === 0 ? 0 : +(m.asins.dead.length / m.asins.totalProducts * 100).toFixed(1);

  return m;
}

function appendHistory(snapshot) {
  let history = [];
  try {
    history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    if (!Array.isArray(history)) history = [];
  } catch {
    history = [];
  }
  history.push(snapshot);
  // Keep last 30 snapshots (≈ 5 days at 4h heartbeat)
  while (history.length > 30) history.shift();
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + '\n');
}

function printSlim(m) {
  const newest = m.brokenLinksReport.generatedAt
    ? new Date(m.brokenLinksReport.generatedAt).toISOString().slice(0, 16)
    : 'never';
  console.log(
    `[${m.timestamp.slice(0, 16)}]  articles=${m.articles.total} (${m.articles.jsonValid} valid)  ` +
    `validator=${m.validator.pass}/${m.articles.total} (${m.validator.passRate}%)  ` +
    `dead-asins=${m.asins.dead.length}/${m.asins.totalProducts} (${m.asins.deadRate}%)  ` +
    `bad-images=${m.images.productsWithBadCdn.length}  ` +
    `link-probe=${newest}`
  );
}

function printFull(m) {
  console.log(JSON.stringify(m, null, 2));
}

function main() {
  const args = process.argv.slice(2);
  const slim = args.includes('--slim');
  const noAppend = args.includes('--print') || slim;

  const snapshot = collect();
  if (!noAppend) appendHistory(snapshot);
  if (slim) printSlim(snapshot);
  else printFull(snapshot);
}

if (require.main === module) main();

module.exports = { collect };
