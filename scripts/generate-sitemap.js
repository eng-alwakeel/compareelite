#!/usr/bin/env node
/**
 * Regenerate sitemap.xml from articles/*.json.
 *
 * Why this exists: vercel.json sets framework=null and buildCommand=null, so
 * Vercel serves the repo as static files — Next.js (and therefore
 * app/sitemap.ts) never runs. The static sitemap.xml at the repo root is the
 * file Google actually crawls. This script keeps it in sync with the
 * articles/ folder. Wired into .github/workflows/update-manifest.yml so it
 * runs on every push that touches articles/.
 *
 *   node scripts/generate-sitemap.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const SITE_URL = 'https://compareelite.com';

const VALID_CATEGORIES = ['Tech', 'Home Office', 'Smart Home', 'Home Fitness'];

const STATIC_PAGES = [
  { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${SITE_URL}/blog`, changefreq: 'daily', priority: '0.9' },
  { loc: `${SITE_URL}/affiliate-disclosure`, changefreq: 'monthly', priority: '0.3' },
  { loc: `${SITE_URL}/privacy`, changefreq: 'monthly', priority: '0.3' },
  { loc: `${SITE_URL}/terms`, changefreq: 'monthly', priority: '0.3' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadArticles() {
  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'TEMPLATE.json');

  return files
    .map((f) => {
      const filePath = path.join(ARTICLES_DIR, f);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
          slug: path.basename(f, '.json'),
          category: data.category || '',
          date: data.date || '',
        };
      } catch (err) {
        console.error(`skipping ${f}: ${err.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

function urlBlock({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

function build(articles, lastmod) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '',
    '  <!-- Static Pages -->',
  ];

  for (const page of STATIC_PAGES) {
    lines.push(urlBlock({ ...page, lastmod }));
  }

  for (const cat of VALID_CATEGORIES) {
    const inCat = articles
      .filter((a) => a.category === cat)
      .sort((a, b) => a.slug.localeCompare(b.slug));
    if (inCat.length === 0) continue;
    lines.push('');
    lines.push(`  <!-- ${cat} Articles -->`);
    for (const article of inCat) {
      lines.push(
        urlBlock({
          loc: `${SITE_URL}/blog/article?slug=${article.slug}`,
          lastmod,
          changefreq: 'monthly',
          priority: '0.8',
        })
      );
    }
  }

  // Articles whose category is not in the whitelist — surface them so the
  // CTO sees the drift instead of silently dropping URLs.
  const stray = articles.filter((a) => !VALID_CATEGORIES.includes(a.category));
  if (stray.length > 0) {
    lines.push('');
    lines.push('  <!-- Articles with unrecognized category -->');
    for (const article of stray) {
      lines.push(
        urlBlock({
          loc: `${SITE_URL}/blog/article?slug=${article.slug}`,
          lastmod,
          changefreq: 'monthly',
          priority: '0.7',
        })
      );
    }
    console.warn(
      `WARN: ${stray.length} article(s) have unrecognized category — listed under fallback section:\n  ` +
        stray.map((a) => `${a.slug} (category: "${a.category}")`).join('\n  ')
    );
  }

  lines.push('');
  lines.push('</urlset>');
  return lines.join('\n') + '\n';
}

function main() {
  const articles = loadArticles();
  const lastmod = todayISO();
  const xml = build(articles, lastmod);
  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
  console.log(
    `Wrote ${path.relative(ROOT, SITEMAP_PATH)} — ${articles.length} articles, lastmod ${lastmod}`
  );
}

if (require.main === module) {
  main();
}

module.exports = { build, loadArticles };
