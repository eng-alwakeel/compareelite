#!/usr/bin/env node
/**
 * Generate per-article static HTML pages.
 *
 * Why: blog/article.html is a single SPA shell — the JS in js/main.js fills
 * in title, canonical, og: tags, and content from the JSON after page load.
 * Google sees the shell first; every article therefore reports the same
 * <title>"Article | CompareElite"</title> and <link rel="canonical">
 * pointing at /blog/article. Result: 51 articles look like duplicates of
 * one URL and Google indexes none of them individually.
 *
 * This script reads the shell as a template and emits one HTML file per
 * article into blog/article/<slug>.html, with the per-article metadata
 * baked into the HTML the crawler receives. Vercel rewrites
 * /blog/article?slug=<X> to /blog/article/<X>.html so existing inbound
 * links and the sitemap continue to work unchanged.
 *
 * The body of each generated file is identical to the shell — js/main.js
 * still does the actual content rendering on the client. We only fix the
 * metadata that Google reads before JS runs.
 *
 * Usage:
 *   node scripts/generate-article-pages.js              # all articles
 *   node scripts/generate-article-pages.js best-x-2026  # one slug
 *
 * Output: blog/article/<slug>.html (overwrites existing)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'blog', 'article.html');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const OUTPUT_DIR = path.join(ROOT, 'blog', 'article');
const SITE_URL = 'https://compareelite.com';
const FALLBACK_OG = `${SITE_URL}/og-image.jpg`;

function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function articleMeta(article) {
  const title = `${article.title} | CompareElite`;
  const description = article.excerpt || 'Expert product comparison and buying guide.';
  const url = `${SITE_URL}/blog/article?slug=${article.slug}`;
  const image = article.thumbnail || FALLBACK_OG;
  const dateIso = article.date ? `${article.date}T00:00:00Z` : '';
  const section = article.category || 'Buying Guides';
  const author = article.author || 'CompareElite Team';
  const keywords = [article.title, article.category, 'buying guide', 'product comparison', '2026']
    .filter(Boolean)
    .join(', ');
  return { title, description, url, image, dateIso, section, author, keywords };
}

function applyMeta(template, m) {
  let out = template;

  // <title>...</title>
  out = out.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtmlText(m.title)}</title>`
  );

  // Replacements anchored on the existing id="..." attributes.
  // Each pattern captures the prefix up to content=" and the suffix " id="...".
  const swaps = [
    [/(<meta name="description" content=")[^"]*(")/,                              m.description],
    [/(<meta name="author" content=")[^"]*(" id="meta-author")/,                  m.author],
    [/(<meta name="keywords" content=")[^"]*(" id="meta-keywords")/,              m.keywords],
    [/(<link rel="canonical" href=")[^"]*(" id="canonical-url")/,                 m.url],
    [/(<meta property="og:url" content=")[^"]*(" id="og-url")/,                   m.url],
    [/(<meta property="og:title" content=")[^"]*(" id="og-title")/,               m.title],
    [/(<meta property="og:description" content=")[^"]*(" id="og-description")/,   m.description],
    [/(<meta property="og:image" content=")[^"]*(" id="og-image")/,               m.image],
    [/(<meta property="article:published_time" content=")[^"]*(" id="og-published")/, m.dateIso],
    [/(<meta property="article:modified_time" content=")[^"]*(" id="og-modified")/,   m.dateIso],
    [/(<meta property="article:section" content=")[^"]*(" id="og-section")/,      m.section],
    [/(<meta name="twitter:title" content=")[^"]*(" id="tw-title")/,              m.title],
    [/(<meta name="twitter:description" content=")[^"]*(" id="tw-description")/,  m.description],
    [/(<meta name="twitter:image" content=")[^"]*(" id="tw-image")/,              m.image],
  ];

  for (const [pat, value] of swaps) {
    if (!pat.test(out)) {
      // Pattern not found means the template structure changed — fail loudly.
      throw new Error(`Template pattern missing: ${pat}. Re-check blog/article.html structure.`);
    }
    out = out.replace(pat, `$1${escapeHtmlAttr(value)}$2`);
  }

  // The shell uses ../css/, ../js/, ../index.html (one level up from /blog/).
  // Generated files live one level deeper at /blog/article/<slug>.html — so
  // ../css/ would resolve to /blog/css/ (wrong). Rewrite all relative paths
  // to absolute so the file works regardless of depth.
  out = out
    .replace(/href="\.\.\/css\//g, 'href="/css/')
    .replace(/src="\.\.\/js\//g,   'src="/js/')
    .replace(/href="\.\.\/index\.html"/g, 'href="/"')
    .replace(/href="index\.html"/g, 'href="/blog"');

  return out;
}

function loadArticles(filterSlug) {
  if (!fs.existsSync(ARTICLES_DIR)) {
    throw new Error(`articles/ directory not found at ${ARTICLES_DIR}`);
  }
  const files = fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'TEMPLATE.json');
  const out = [];
  for (const file of files) {
    let article;
    try {
      article = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8'));
    } catch (err) {
      console.error(`Skipping ${file}: invalid JSON (${err.message})`);
      continue;
    }
    if (!article.slug) {
      console.error(`Skipping ${file}: missing slug`);
      continue;
    }
    if (article.slug !== path.basename(file, '.json')) {
      console.error(`Skipping ${file}: slug "${article.slug}" does not match filename`);
      continue;
    }
    if (filterSlug && article.slug !== filterSlug) continue;
    out.push(article);
  }
  return out;
}

function pruneStaleHtml(currentSlugs) {
  if (!fs.existsSync(OUTPUT_DIR)) return 0;
  const valid = new Set(currentSlugs);
  let removed = 0;
  for (const f of fs.readdirSync(OUTPUT_DIR)) {
    if (!f.endsWith('.html')) continue;
    const slug = f.replace(/\.html$/, '');
    if (!valid.has(slug)) {
      fs.unlinkSync(path.join(OUTPUT_DIR, f));
      removed++;
    }
  }
  return removed;
}

function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const filterSlug = args[0] || null;

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Template not found: ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const articles = loadArticles(filterSlug);
  if (articles.length === 0) {
    console.log(filterSlug ? `No article matched slug "${filterSlug}"` : 'No articles found');
    process.exit(filterSlug ? 1 : 0);
  }

  let written = 0;
  for (const article of articles) {
    const meta = articleMeta(article);
    const html = applyMeta(template, meta);
    const outPath = path.join(OUTPUT_DIR, `${article.slug}.html`);
    fs.writeFileSync(outPath, html);
    written++;
  }

  // Only prune when generating the full set (not on single-slug runs).
  let pruned = 0;
  if (!filterSlug) {
    const allArticles = loadArticles(null);
    pruned = pruneStaleHtml(allArticles.map(a => a.slug));
  }

  console.log(`Generated ${written} article HTML file(s) into ${path.relative(ROOT, OUTPUT_DIR)}/`);
  if (pruned > 0) console.log(`Pruned ${pruned} stale file(s).`);
}

main();
