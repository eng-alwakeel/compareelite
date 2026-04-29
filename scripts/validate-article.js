#!/usr/bin/env node
/**
 * CompareElite article validator.
 *
 * Enforces the strict schema in articles/TEMPLATE.json against what the
 * website renderer (js/main.js) actually reads. Run on a single file or
 * every JSON file in articles/. Exit code 0 = all PASS, 1 = at least one FAIL.
 *
 *   node scripts/validate-article.js articles/best-air-fryers-2026.json
 *   node scripts/validate-article.js                       # validate all
 */

'use strict';

const fs = require('fs');
const path = require('path');

const VALID_CATEGORIES = ['Tech', 'Home Office', 'Smart Home', 'Home Fitness'];
const AMAZON_TAG = '?tag=compareelite-20';
const AMAZON_CDN_PREFIX = 'https://m.media-amazon.com/images/I/';
const AMAZON_CDN_NA_PREFIX = 'https://images-na.ssl-images-amazon.com/images/';
function isAmazonCdnImage(url) {
  return url.startsWith(AMAZON_CDN_PREFIX) || url.startsWith(AMAZON_CDN_NA_PREFIX);
}
const MIN_PRODUCTS = 6;
const FAQ_COUNT = 5;
const RATING_PATTERN = /^\d+(?:\.\d+)?\/10$/;
const ASIN_PATH_RE = /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/;
const BROKEN_LINKS_PATH = path.resolve(__dirname, '..', 'data', 'broken-amazon-links.json');

let knownDeadCache = null;
function knownDeadAsins() {
  if (knownDeadCache !== null) return knownDeadCache;
  try {
    const raw = fs.readFileSync(BROKEN_LINKS_PATH, 'utf8');
    const data = JSON.parse(raw);
    const dead = new Map();
    for (const r of data.results || []) {
      if (r.state === 'DEAD' && r.asin) {
        dead.set(r.asin, r.reason || 'previously confirmed dead');
      }
    }
    knownDeadCache = dead;
  } catch {
    knownDeadCache = new Map();
  }
  return knownDeadCache;
}

const REQUIRED_TOP_FIELDS = [
  'title', 'slug', 'category', 'date', 'thumbnail', 'excerpt',
  'products', 'buying_guide', 'faq', 'related_articles',
];

const REQUIRED_PRODUCT_FIELDS = [
  'name', 'price', 'rating', 'best_for', 'image', 'link', 'pros', 'cons',
];

const REQUIRED_BUYING_GUIDE_FIELDS = ['title', 'body'];
const REQUIRED_FAQ_FIELDS = ['q', 'a'];

const MARKDOWN_PATTERNS = [
  { name: '**bold**', re: /\*\*[^*]+\*\*/ },
  { name: '*italic*', re: /(^|[^*])\*[^*\n]+\*(?!\*)/ },
  { name: '# heading', re: /^\s{0,3}#{1,6}\s/m },
  { name: '`code`', re: /`[^`]+`/ },
  { name: '[link](url)', re: /\[[^\]]+\]\([^)]+\)/ },
];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isHttpUrl(v) {
  return isNonEmptyString(v) && /^https?:\/\/\S+$/i.test(v.trim());
}

function findMarkdown(text) {
  if (typeof text !== 'string') return null;
  for (const { name, re } of MARKDOWN_PATTERNS) {
    if (re.test(text)) return name;
  }
  return null;
}

function ratingNumber(rating) {
  if (typeof rating !== 'string') return null;
  const m = rating.match(/^(\d+(?:\.\d+)?)\/10$/);
  return m ? parseFloat(m[1]) : null;
}

function validateArticle(article, filePath) {
  const errors = [];
  const fileName = path.basename(filePath, '.json');

  for (const field of REQUIRED_TOP_FIELDS) {
    if (!(field in article)) errors.push(`missing required field: ${field}`);
  }

  for (const field of ['title', 'slug', 'category', 'date', 'thumbnail', 'excerpt']) {
    if (field in article && !isNonEmptyString(article[field])) {
      errors.push(`field "${field}" must be a non-empty string`);
    }
  }

  if (article.category && !VALID_CATEGORIES.includes(article.category)) {
    errors.push(`category "${article.category}" is not one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (article.thumbnail) {
    if (!isHttpUrl(article.thumbnail)) {
      errors.push('thumbnail must be a valid http(s) image URL');
    } else if (!isAmazonCdnImage(article.thumbnail)) {
      errors.push(`thumbnail must be an Amazon CDN URL (${AMAZON_CDN_PREFIX}... or ${AMAZON_CDN_NA_PREFIX}...) — set it equal to products[0].image so the article card shows the Best Overall product`);
    } else if (Array.isArray(article.products) && article.products[0] && article.products[0].image && article.thumbnail !== article.products[0].image) {
      errors.push('thumbnail must equal products[0].image (the Best Overall product)');
    }
  }

  if (article.slug && fileName !== 'TEMPLATE' && article.slug !== fileName) {
    errors.push(`slug "${article.slug}" does not match filename "${fileName}"`);
  }

  for (const field of ['title', 'excerpt']) {
    const md = findMarkdown(article[field]);
    if (md) errors.push(`markdown syntax (${md}) detected in "${field}"`);
  }

  if (typeof article.excerpt === 'string') {
    const len = article.excerpt.length;
    if (len < 150 || len > 160) {
      errors.push(`excerpt must be 150–160 characters (found ${len})`);
    }
  }

  // products
  if (!Array.isArray(article.products)) {
    errors.push('products must be an array');
  } else {
    if (article.products.length < MIN_PRODUCTS) {
      errors.push(`products must have at least ${MIN_PRODUCTS} items (found ${article.products.length})`);
    }
    article.products.forEach((p, i) => {
      const tag = `products[${i}]`;
      if (!p || typeof p !== 'object') {
        errors.push(`${tag} must be an object`);
        return;
      }
      for (const f of REQUIRED_PRODUCT_FIELDS) {
        if (!(f in p)) errors.push(`${tag} missing field: ${f}`);
      }
      if ('rank' in p) {
        errors.push(`${tag}.rank field is not used by the renderer — remove it`);
      }
      for (const f of ['name', 'price', 'best_for', 'image', 'link']) {
        if (f in p && !isNonEmptyString(p[f])) {
          errors.push(`${tag}.${f} must be a non-empty string`);
        }
      }
      if ('rating' in p) {
        if (typeof p.rating !== 'string' || !RATING_PATTERN.test(p.rating)) {
          errors.push(`${tag}.rating must be a string in the form "9.8/10"`);
        } else {
          const n = ratingNumber(p.rating);
          if (n === null || n < 0 || n > 10) {
            errors.push(`${tag}.rating must be between 0 and 10 (got ${p.rating})`);
          }
        }
      }
      if ('image' in p && isNonEmptyString(p.image)) {
        if (!isHttpUrl(p.image)) {
          errors.push(`${tag}.image must be a valid http(s) URL`);
        } else if (!isAmazonCdnImage(p.image)) {
          errors.push(`${tag}.image must be an Amazon CDN URL (${AMAZON_CDN_PREFIX}[ID]._SL500_.jpg or ${AMAZON_CDN_NA_PREFIX}P/[ASIN].01._SL500_.jpg) — third-party CDNs (Dell, blogs, etc.) are blocked or hotlink-protected`);
        }
      }
      if ('link' in p && isNonEmptyString(p.link)) {
        if (!isHttpUrl(p.link)) errors.push(`${tag}.link must be a valid http(s) URL`);
        if (!p.link.includes(AMAZON_TAG)) {
          errors.push(`${tag}.link must contain ${AMAZON_TAG}`);
        }
        const asinMatch = p.link.match(ASIN_PATH_RE);
        if (!asinMatch) {
          errors.push(`${tag}.link must point to /dp/<10-char ASIN>`);
        } else {
          const asin = asinMatch[1];
          const dead = knownDeadAsins();
          if (dead.has(asin)) {
            errors.push(`${tag}.link ASIN ${asin} is in the broken-links report (${dead.get(asin)}) — replace with a verified ASIN`);
          }
        }
      }
      if ('pros' in p) {
        if (!Array.isArray(p.pros) || p.pros.length === 0) {
          errors.push(`${tag}.pros must be a non-empty array`);
        } else {
          p.pros.forEach((entry, j) => {
            if (!isNonEmptyString(entry)) errors.push(`${tag}.pros[${j}] must be a non-empty string`);
            const md = findMarkdown(entry);
            if (md) errors.push(`${tag}.pros[${j}] contains markdown (${md})`);
          });
        }
      }
      if ('cons' in p) {
        if (!Array.isArray(p.cons) || p.cons.length === 0) {
          errors.push(`${tag}.cons must be a non-empty array`);
        } else {
          p.cons.forEach((entry, j) => {
            if (!isNonEmptyString(entry)) errors.push(`${tag}.cons[${j}] must be a non-empty string`);
            const md = findMarkdown(entry);
            if (md) errors.push(`${tag}.cons[${j}] contains markdown (${md})`);
          });
        }
      }
    });
  }

  // buying_guide
  if (!Array.isArray(article.buying_guide)) {
    errors.push('buying_guide must be an array');
  } else {
    article.buying_guide.forEach((item, i) => {
      const tag = `buying_guide[${i}]`;
      if (!item || typeof item !== 'object') {
        errors.push(`${tag} must be an object`);
        return;
      }
      for (const f of REQUIRED_BUYING_GUIDE_FIELDS) {
        if (!(f in item)) errors.push(`${tag} missing field: ${f}`);
        else if (!isNonEmptyString(item[f])) errors.push(`${tag}.${f} must be a non-empty string`);
      }
      const mdTitle = findMarkdown(item.title);
      if (mdTitle) errors.push(`${tag}.title contains markdown (${mdTitle})`);
      const mdBody = findMarkdown(item.body);
      if (mdBody) errors.push(`${tag}.body contains markdown (${mdBody})`);
    });
  }

  // faq
  if (!Array.isArray(article.faq)) {
    errors.push('faq must be an array');
  } else {
    if (article.faq.length !== FAQ_COUNT) {
      errors.push(`faq must have exactly ${FAQ_COUNT} items (found ${article.faq.length})`);
    }
    article.faq.forEach((item, i) => {
      const tag = `faq[${i}]`;
      if (!item || typeof item !== 'object') {
        errors.push(`${tag} must be an object`);
        return;
      }
      for (const f of REQUIRED_FAQ_FIELDS) {
        if (!(f in item)) errors.push(`${tag} missing field: ${f}`);
        else if (!isNonEmptyString(item[f])) errors.push(`${tag}.${f} must be a non-empty string`);
      }
      const mdQ = findMarkdown(item.q);
      if (mdQ) errors.push(`${tag}.q contains markdown (${mdQ})`);
      const mdA = findMarkdown(item.a);
      if (mdA) errors.push(`${tag}.a contains markdown (${mdA})`);
    });
  }

  if ('related_articles' in article && !Array.isArray(article.related_articles)) {
    errors.push('related_articles must be an array');
  }

  return errors;
}

function validateFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return { filePath, errors: [`cannot read file: ${err.message}`] };
  }
  let article;
  try {
    article = JSON.parse(raw);
  } catch (err) {
    return { filePath, errors: [`invalid JSON: ${err.message}`] };
  }
  return { filePath, errors: validateArticle(article, filePath) };
}

function printResult(result) {
  const rel = path.relative(process.cwd(), result.filePath);
  if (result.errors.length === 0) {
    console.log(`PASS ${rel}`);
    return true;
  }
  console.log(`FAIL ${rel}`);
  for (const err of result.errors) console.log(`  - ${err}`);
  return false;
}

function main() {
  const args = process.argv.slice(2);
  let files;
  if (args.length > 0) {
    files = args.map((a) => path.resolve(a));
  } else {
    const articlesDir = path.resolve(__dirname, '..', 'articles');
    files = fs
      .readdirSync(articlesDir)
      .filter((f) => f.endsWith('.json') && f !== 'TEMPLATE.json')
      .map((f) => path.join(articlesDir, f));
  }

  let passed = 0;
  let failed = 0;
  for (const file of files) {
    const result = validateFile(file);
    if (printResult(result)) passed += 1;
    else failed += 1;
  }

  console.log('');
  console.log(`Summary: ${passed} passed, ${failed} failed (${files.length} total)`);
  process.exit(failed === 0 ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { validateArticle, validateFile, VALID_CATEGORIES };
