#!/usr/bin/env node
/**
 * CompareElite brand article validator.
 *
 * Validates brand articles (schema_version: "brand-hub-v1") stored in brands/.
 * Exit code 0 = all PASS, 1 = at least one FAIL.
 *
 *   node scripts/validate-brand-article.js brands/apple/best-apple-iphones-2026.json
 *   node scripts/validate-brand-article.js          # validate all brand articles
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Constants ───────────────────────────────────────────────────────────────

const AMAZON_TAG           = '?tag=compareelite-20';
const AMAZON_CDN_PREFIX    = 'https://m.media-amazon.com/images/I/';
const AMAZON_CDN_NA_PREFIX = 'https://images-na.ssl-images-amazon.com/images/';
const ASIN_PATH_RE         = /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/;
const RATING_PATTERN       = /^\d+(?:\.\d+)?\/10$/;

const MIN_PRODUCTS        = 4;
const MIN_FAQ             = 6;
const MIN_BUYING_GUIDE    = 4;
const MIN_HOURS_TESTED    = 50;
const MIN_WHY_WORDS       = 150;
const MIN_BODY_WORDS      = 150;
const MIN_FAQ_ANSWER_WORDS = 150;
const MIN_BRAND_DESC_WORDS = 100;
const MIN_METHODOLOGY_WORDS = 180;
const MIN_TRUST_WORDS      = 130;

// ── Utilities ────────────────────────────────────────────────────────────────

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isHttpUrl(v) {
  return isNonEmptyString(v) && /^https?:\/\/\S+$/i.test(v.trim());
}

function isAmazonCdnImage(url) {
  return url.startsWith(AMAZON_CDN_PREFIX) || url.startsWith(AMAZON_CDN_NA_PREFIX);
}

function wordCount(text) {
  if (typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function ratingNumber(rating) {
  const m = String(rating).match(/^(\d+(?:\.\d+)?)\/10$/);
  return m ? parseFloat(m[1]) : null;
}

// ── Validators ───────────────────────────────────────────────────────────────

function validateBrandArticle(data, filePath) {
  const errors = [];
  const fileName = path.basename(filePath, '.json');

  // Schema version
  if (data.schema_version !== 'brand-hub-v1') {
    errors.push(`schema_version must be "brand-hub-v1" (found "${data.schema_version}")`);
  }
  if (data.type !== 'brand_hub') {
    errors.push(`type must be "brand_hub" (found "${data.type}")`);
  }

  // ── brand ──────────────────────────────────────────────────────────────────
  const brand = data.brand || {};
  const brandRequired = ['name', 'slug', 'logo', 'tagline', 'founded', 'country', 'official_url', 'description'];
  for (const f of brandRequired) {
    if (!(f in brand)) errors.push(`brand.${f} is missing`);
  }
  if (brand.description && wordCount(brand.description) < MIN_BRAND_DESC_WORDS) {
    errors.push(`brand.description must be at least ${MIN_BRAND_DESC_WORDS} words (found ${wordCount(brand.description)})`);
  }
  if (brand.logo && !isHttpUrl(brand.logo)) {
    errors.push('brand.logo must be a valid http(s) URL');
  }
  if (brand.official_url && !isHttpUrl(brand.official_url)) {
    errors.push('brand.official_url must be a valid http(s) URL');
  }

  // ── article ────────────────────────────────────────────────────────────────
  const article = data.article || {};
  const articleRequired = ['title', 'slug', 'category', 'product_line', 'date', 'last_updated', 'read_time', 'thumbnail', 'excerpt', 'verdict'];
  for (const f of articleRequired) {
    if (!(f in article)) errors.push(`article.${f} is missing`);
    else if (['title', 'slug', 'category', 'thumbnail', 'excerpt', 'verdict'].includes(f) && !isNonEmptyString(article[f])) {
      errors.push(`article.${f} must be a non-empty string`);
    }
  }
  if (article.slug && fileName !== '_template' && article.slug !== fileName) {
    errors.push(`article.slug "${article.slug}" does not match filename "${fileName}"`);
  }
  if (article.thumbnail && isNonEmptyString(article.thumbnail)) {
    if (!isHttpUrl(article.thumbnail)) {
      errors.push('article.thumbnail must be a valid http(s) URL');
    } else if (!isAmazonCdnImage(article.thumbnail)) {
      errors.push(`article.thumbnail must be an Amazon CDN URL (${AMAZON_CDN_PREFIX}...)`);
    }
  }

  // ── hero ───────────────────────────────────────────────────────────────────
  const hero = data.hero || {};
  if (!isNonEmptyString(hero.headline)) errors.push('hero.headline is missing or empty');
  if (!isNonEmptyString(hero.intro))    errors.push('hero.intro is missing or empty');
  if (!Array.isArray(hero.key_highlights) || hero.key_highlights.length === 0) {
    errors.push('hero.key_highlights must be a non-empty array');
  } else {
    hero.key_highlights.forEach((h, i) => {
      if (!isNonEmptyString(h.icon))  errors.push(`hero.key_highlights[${i}].icon is missing`);
      if (!isNonEmptyString(h.label)) errors.push(`hero.key_highlights[${i}].label is missing`);
      if (!isNonEmptyString(h.value)) errors.push(`hero.key_highlights[${i}].value is missing`);
    });
  }

  // ── quick_picks ────────────────────────────────────────────────────────────
  if (!data.quick_picks || typeof data.quick_picks !== 'object') {
    errors.push('quick_picks must be an object');
  } else if (Object.keys(data.quick_picks).length === 0) {
    errors.push('quick_picks must have at least one entry');
  }

  // ── comparison_table ───────────────────────────────────────────────────────
  const ct = data.comparison_table || {};
  if (!Array.isArray(ct.headers) || ct.headers.length < 2) {
    errors.push('comparison_table.headers must be an array with at least 2 columns');
  }
  if (!Array.isArray(ct.rows) || ct.rows.length === 0) {
    errors.push('comparison_table.rows must be a non-empty array');
  } else if (Array.isArray(ct.headers)) {
    ct.rows.forEach((row, i) => {
      if (!Array.isArray(row) || row.length !== ct.headers.length) {
        errors.push(`comparison_table.rows[${i}] must have ${ct.headers.length} cells (matching headers)`);
      }
    });
  }

  // ── products ───────────────────────────────────────────────────────────────
  if (!Array.isArray(data.products)) {
    errors.push('products must be an array');
  } else {
    if (data.products.length < MIN_PRODUCTS) {
      errors.push(`products must have at least ${MIN_PRODUCTS} items (found ${data.products.length})`);
    }
    data.products.forEach((p, i) => {
      const tag = `products[${i}]`;
      if (!p || typeof p !== 'object') { errors.push(`${tag} must be an object`); return; }

      const required = ['id', 'name', 'asin', 'price', 'rating', 'best_for', 'tagline', 'images',
                        'key_specs', 'why_we_picked_it', 'pros', 'cons', 'best_for_user',
                        'color_options', 'amazon_link', 'verdict'];
      for (const f of required) {
        if (!(f in p)) errors.push(`${tag} missing field: ${f}`);
      }

      // Rating
      if ('rating' in p) {
        if (!RATING_PATTERN.test(p.rating)) {
          errors.push(`${tag}.rating must be "X/10" format (found "${p.rating}")`);
        } else {
          const n = ratingNumber(p.rating);
          if (n === null || n < 0 || n > 10) errors.push(`${tag}.rating value must be 0-10`);
        }
      }

      // Images
      if ('images' in p) {
        if (!Array.isArray(p.images) || p.images.length < 3) {
          errors.push(`${tag}.images must have at least 3 images (found ${Array.isArray(p.images) ? p.images.length : 0})`);
        } else {
          p.images.forEach((img, j) => {
            if (!isHttpUrl(img)) {
              errors.push(`${tag}.images[${j}] must be a valid http(s) URL`);
            } else if (!isAmazonCdnImage(img)) {
              errors.push(`${tag}.images[${j}] must be an Amazon CDN URL (${AMAZON_CDN_PREFIX}...)`);
            }
          });
        }
      }

      // Amazon link
      if ('amazon_link' in p && isNonEmptyString(p.amazon_link)) {
        if (!isHttpUrl(p.amazon_link)) {
          errors.push(`${tag}.amazon_link must be a valid http(s) URL`);
        }
        if (!p.amazon_link.includes(AMAZON_TAG)) {
          errors.push(`${tag}.amazon_link must contain ${AMAZON_TAG}`);
        }
        if (!ASIN_PATH_RE.test(p.amazon_link)) {
          errors.push(`${tag}.amazon_link must contain /dp/<10-char ASIN>`);
        }
      }

      // ASIN format
      if ('asin' in p && isNonEmptyString(p.asin)) {
        if (!/^[A-Z0-9]{10}$/.test(p.asin)) {
          errors.push(`${tag}.asin must be exactly 10 uppercase alphanumeric characters (found "${p.asin}")`);
        }
      }

      // Why we picked it word count
      if ('why_we_picked_it' in p && wordCount(p.why_we_picked_it) < MIN_WHY_WORDS) {
        errors.push(`${tag}.why_we_picked_it must be at least ${MIN_WHY_WORDS} words (found ${wordCount(p.why_we_picked_it)})`);
      }

      // Pros
      if ('pros' in p) {
        if (!Array.isArray(p.pros) || p.pros.length < 3) {
          errors.push(`${tag}.pros must have at least 3 items (found ${Array.isArray(p.pros) ? p.pros.length : 0})`);
        }
      }

      // Cons
      if ('cons' in p) {
        if (!Array.isArray(p.cons) || p.cons.length < 2) {
          errors.push(`${tag}.cons must have at least 2 items (found ${Array.isArray(p.cons) ? p.cons.length : 0})`);
        }
      }

      // key_specs
      if ('key_specs' in p) {
        if (!Array.isArray(p.key_specs) || p.key_specs.length < 4) {
          errors.push(`${tag}.key_specs must have at least 4 entries (found ${Array.isArray(p.key_specs) ? p.key_specs.length : 0})`);
        } else {
          p.key_specs.forEach((s, j) => {
            if (!isNonEmptyString(s.label)) errors.push(`${tag}.key_specs[${j}].label is empty`);
            if (!isNonEmptyString(s.value)) errors.push(`${tag}.key_specs[${j}].value is empty`);
          });
        }
      }
    });
  }

  // ── buying_guide ──────────────────────────────────────────────────────────
  if (!Array.isArray(data.buying_guide)) {
    errors.push('buying_guide must be an array');
  } else {
    if (data.buying_guide.length < MIN_BUYING_GUIDE) {
      errors.push(`buying_guide must have at least ${MIN_BUYING_GUIDE} sections (found ${data.buying_guide.length})`);
    }
    data.buying_guide.forEach((item, i) => {
      const tag = `buying_guide[${i}]`;
      if (!isNonEmptyString(item.title)) errors.push(`${tag}.title is missing or empty`);
      if (!isNonEmptyString(item.body))  errors.push(`${tag}.body is missing or empty`);
      else if (wordCount(item.body) < MIN_BODY_WORDS) {
        errors.push(`${tag}.body must be at least ${MIN_BODY_WORDS} words (found ${wordCount(item.body)})`);
      }
    });
  }

  // ── brand_highlights ──────────────────────────────────────────────────────
  if (!Array.isArray(data.brand_highlights) || data.brand_highlights.length < 4) {
    errors.push(`brand_highlights must be an array with at least 4 items (found ${Array.isArray(data.brand_highlights) ? data.brand_highlights.length : 0})`);
  } else {
    data.brand_highlights.forEach((h, i) => {
      if (!isNonEmptyString(h.icon))  errors.push(`brand_highlights[${i}].icon is missing`);
      if (!isNonEmptyString(h.title)) errors.push(`brand_highlights[${i}].title is missing`);
      if (!isNonEmptyString(h.body))  errors.push(`brand_highlights[${i}].body is missing`);
    });
  }

  // ── methodology ───────────────────────────────────────────────────────────
  const m = data.methodology || {};
  if (!isNonEmptyString(m.title)) errors.push('methodology.title is missing or empty');
  if (!isNonEmptyString(m.body))  errors.push('methodology.body is missing or empty');
  else if (wordCount(m.body) < MIN_METHODOLOGY_WORDS) {
    errors.push(`methodology.body must be at least ${MIN_METHODOLOGY_WORDS} words (found ${wordCount(m.body)})`);
  }
  if (!Array.isArray(m.test_criteria) || m.test_criteria.length === 0) {
    errors.push('methodology.test_criteria must be a non-empty array');
  }
  if (typeof m.hours_tested !== 'number' || m.hours_tested < MIN_HOURS_TESTED) {
    errors.push(`methodology.hours_tested must be a number >= ${MIN_HOURS_TESTED} (found ${m.hours_tested})`);
  }

  // ── trust_section ─────────────────────────────────────────────────────────
  const t = data.trust_section || {};
  if (!isNonEmptyString(t.title)) errors.push('trust_section.title is missing or empty');
  if (!isNonEmptyString(t.body))  errors.push('trust_section.body is missing or empty');
  else if (wordCount(t.body) < MIN_TRUST_WORDS) {
    errors.push(`trust_section.body must be at least ${MIN_TRUST_WORDS} words (found ${wordCount(t.body)})`);
  }
  if (!Array.isArray(t.credentials) || t.credentials.length === 0) {
    errors.push('trust_section.credentials must be a non-empty array');
  }

  // ── faq ───────────────────────────────────────────────────────────────────
  if (!Array.isArray(data.faq)) {
    errors.push('faq must be an array');
  } else {
    if (data.faq.length < MIN_FAQ) {
      errors.push(`faq must have at least ${MIN_FAQ} items (found ${data.faq.length})`);
    }
    data.faq.forEach((item, i) => {
      const tag = `faq[${i}]`;
      if (!isNonEmptyString(item.q)) errors.push(`${tag}.q is missing or empty`);
      if (!isNonEmptyString(item.a)) errors.push(`${tag}.a is missing or empty`);
      else if (wordCount(item.a) < MIN_FAQ_ANSWER_WORDS) {
        errors.push(`${tag}.a must be at least ${MIN_FAQ_ANSWER_WORDS} words (found ${wordCount(item.a)})`);
      }
    });
  }

  // ── schema_org ────────────────────────────────────────────────────────────
  const schema = data.schema_org || {};
  if (schema['@context'] !== 'https://schema.org') {
    errors.push('schema_org["@context"] must be "https://schema.org"');
  }
  if (!isNonEmptyString(schema['@type'])) {
    errors.push('schema_org["@type"] is missing or empty');
  }
  if (!isNonEmptyString(schema.name)) {
    errors.push('schema_org.name is missing or empty');
  }

  // ── related arrays ────────────────────────────────────────────────────────
  if ('related_brand_articles' in data && !Array.isArray(data.related_brand_articles)) {
    errors.push('related_brand_articles must be an array');
  }
  if ('related_general_articles' in data && !Array.isArray(data.related_general_articles)) {
    errors.push('related_general_articles must be an array');
  }

  return errors;
}

// ── File I/O ─────────────────────────────────────────────────────────────────

function validateFile(filePath) {
  let raw;
  try { raw = fs.readFileSync(filePath, 'utf8'); }
  catch (err) { return { filePath, errors: [`cannot read file: ${err.message}`] }; }

  let data;
  try { data = JSON.parse(raw); }
  catch (err) { return { filePath, errors: [`invalid JSON: ${err.message}`] }; }

  return { filePath, errors: validateBrandArticle(data, filePath) };
}

function printResult(result) {
  const rel = path.relative(process.cwd(), result.filePath);
  if (result.errors.length === 0) {
    console.log(`PASS  ${rel}`);
    return true;
  }
  console.log(`FAIL  ${rel}`);
  for (const err of result.errors) console.log(`  ✖  ${err}`);
  return false;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function collectBrandFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectBrandFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('_') && entry.name !== 'index.json') {
      files.push(full);
    }
  }
  return files;
}

function main() {
  const args = process.argv.slice(2);
  let files;

  if (args.length > 0) {
    files = args.map(a => path.resolve(a));
  } else {
    const brandsDir = path.resolve(__dirname, '..', 'brands');
    files = collectBrandFiles(brandsDir);
  }

  if (files.length === 0) {
    console.log('No brand article files found.');
    process.exit(0);
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

module.exports = { validateBrandArticle, validateFile };
