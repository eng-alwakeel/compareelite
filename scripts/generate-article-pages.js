#!/usr/bin/env node
/**
 * Generate per-article static HTML pages.
 *
 * Each generated file has two layers:
 *   1. Full article content pre-rendered as static HTML inside
 *      id="article-header" and id="article-content" — readable by
 *      Googlebot without executing JavaScript.
 *   2. js/main.js still runs client-side and replaces/enhances the
 *      static content with the full interactive UI.
 *
 * The data-ssg="true" attribute on id="article-content" tells main.js
 * that pre-rendered content exists and it can skip skeleton animations.
 *
 * Usage:
 *   node scripts/generate-article-pages.js              # all articles
 *   node scripts/generate-article-pages.js best-x-2026  # one slug
 *
 * Output: blog/article/<slug>.html (overwrites existing)
 */

const fs = require('fs');
const path = require('path');
const { generateStructuredDataScripts } = require('../lib/structured-data');

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

// ── Pre-rendered body content (SSG) ──────────────────────────────────────────
// Googlebot reads this directly; JS replaces it with the full UI after load.

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPrerenderedHeader(article) {
  const category      = esc(article.category || 'Buying Guide');
  const title         = esc(article.title || '');
  const excerpt       = esc(article.excerpt || '');
  const authorName    = esc(article.author || 'CompareElite Team');
  const authorUrl     = article.author_url || '';
  const authorBio     = esc(article.author_bio || '');
  const reviewer      = esc(article.reviewer || '');
  const reviewerTitle = esc(article.reviewer_title || '');
  const date          = article.date
    ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const updatedAt     = article.updatedAt
    ? new Date(article.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const readTime      = article.read_time || '';
  const image         = esc(article.thumbnail || '');

  const authorDisplay = authorUrl
    ? `<a href="${esc(authorUrl)}" rel="author" target="_blank" style="color:inherit;text-decoration:underline;">${authorName}</a>`
    : `<strong>${authorName}</strong>`;

  return `
        <div class="article-category-badge" style="display:inline-block;background:var(--primary,#2563eb);color:#fff;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.8rem;font-weight:600;margin-bottom:1rem;">${category}</div>
        <h1 style="font-size:clamp(1.5rem,4vw,2.5rem);font-weight:800;line-height:1.2;margin-bottom:1rem;">${title}</h1>
        <p style="font-size:1.1rem;color:var(--text-secondary,#64748b);margin-bottom:1.5rem;">${excerpt}</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem 1rem;justify-content:center;font-size:0.875rem;color:var(--text-secondary,#64748b);margin-bottom:${authorBio || reviewer ? '0.75rem' : '2rem'};">
          <span>By ${authorDisplay}</span>
          ${date ? `<span>·</span><span>${esc(date)}</span>` : ''}
          ${readTime ? `<span>·</span><span>${esc(readTime)}</span>` : ''}
          ${updatedAt && updatedAt !== date ? `<span>·</span><span>Updated ${esc(updatedAt)}</span>` : ''}
        </div>
        ${authorBio ? `<p style="font-size:0.8rem;color:var(--text-secondary,#64748b);margin-bottom:0.5rem;font-style:italic;">${authorBio}</p>` : ''}
        ${reviewer ? `<p style="font-size:0.8rem;color:var(--text-secondary,#64748b);margin-bottom:1.75rem;">Reviewed by <strong>${reviewer}</strong>${reviewerTitle ? `, ${reviewerTitle}` : ''}</p>` : ''}
        ${image ? `<img src="${image}" alt="${title}" style="width:100%;max-height:400px;object-fit:cover;border-radius:12px;margin-bottom:2rem;" loading="eager" />` : ''}`;
}

function buildPrerenderedContent(article) {
  const lines = [];

  // Intro
  if (article.intro) {
    lines.push(`<p style="font-size:1.05rem;line-height:1.7;margin-bottom:1.5rem;">${esc(article.intro)}</p>`);
  }

  // Key takeaways
  if (Array.isArray(article.key_takeaways) && article.key_takeaways.length) {
    lines.push(`<div style="background:var(--bg-secondary,#f8fafc);border-left:4px solid var(--primary,#2563eb);padding:1rem 1.25rem;border-radius:0 8px 8px 0;margin-bottom:2rem;">`);
    lines.push(`<h2 style="font-size:1rem;font-weight:700;margin-bottom:0.5rem;">Key Takeaways</h2><ul style="margin:0;padding-left:1.2rem;">`);
    for (const kt of article.key_takeaways) {
      lines.push(`<li style="margin-bottom:0.25rem;">${esc(kt)}</li>`);
    }
    lines.push(`</ul></div>`);
  }

  // Products
  if (Array.isArray(article.products) && article.products.length) {
    lines.push(`<h2 style="font-size:1.4rem;font-weight:700;margin:2rem 0 1rem;">Top Picks</h2>`);
    for (const p of article.products) {
      const name    = esc(p.name || '');
      const bestFor = esc(p.best_for || '');
      const price   = esc(p.price || '');
      const rating  = esc(p.rating || '');
      const link    = esc(p.link || `https://www.amazon.com/dp/${p.asin}?tag=compareelite-20`);
      const image   = esc(p.image || '');
      const pros    = Array.isArray(p.pros) ? p.pros.slice(0, 3) : [];

      lines.push(`<div style="border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:1.25rem;margin-bottom:1.25rem;">`);
      if (bestFor) lines.push(`<div style="font-size:0.75rem;font-weight:700;color:var(--primary,#2563eb);text-transform:uppercase;margin-bottom:0.5rem;">${bestFor}</div>`);
      lines.push(`<h3 style="font-size:1.1rem;font-weight:700;margin:0 0 0.5rem;"><a href="${link}" rel="nofollow sponsored" target="_blank" style="color:inherit;text-decoration:none;">${name}</a></h3>`);
      if (image) lines.push(`<img src="${image}" alt="${name}" style="width:120px;height:120px;object-fit:contain;float:right;margin:0 0 0.5rem 1rem;" loading="lazy" />`);
      if (rating || price) {
        lines.push(`<div style="font-size:0.875rem;margin-bottom:0.5rem;">`);
        if (rating) lines.push(`<strong>Rating:</strong> ${rating}  `);
        if (price)  lines.push(`<strong>Price:</strong> ${price}`);
        lines.push(`</div>`);
      }
      if (pros.length) {
        lines.push(`<ul style="margin:0.5rem 0 0;padding-left:1.2rem;font-size:0.875rem;">`);
        for (const pro of pros) lines.push(`<li>${esc(pro)}</li>`);
        lines.push(`</ul>`);
      }
      lines.push(`<div style="clear:both;"></div></div>`);
    }
  }

  // Testing narrative
  if (article.testing_narrative) {
    lines.push(`<div style="background:var(--bg-secondary,#f8fafc);padding:1rem 1.25rem;border-radius:8px;margin:2rem 0;font-style:italic;">`);
    lines.push(`<p style="margin:0;">${esc(article.testing_narrative)}</p></div>`);
  }

  // Buying guide
  if (Array.isArray(article.buying_guide) && article.buying_guide.length) {
    lines.push(`<h2 style="font-size:1.4rem;font-weight:700;margin:2rem 0 1rem;">Buying Guide</h2>`);
    for (const section of article.buying_guide) {
      const heading = esc(section.title || section.heading || '');
      const body    = esc(section.body || section.content || '');
      if (heading) lines.push(`<h3 style="font-size:1.1rem;font-weight:700;margin:1.25rem 0 0.5rem;">${heading}</h3>`);
      if (body)    lines.push(`<p style="line-height:1.7;margin-bottom:1rem;">${body}</p>`);
    }
  }

  // FAQ
  if (Array.isArray(article.faq) && article.faq.length) {
    lines.push(`<h2 style="font-size:1.4rem;font-weight:700;margin:2rem 0 1rem;">Frequently Asked Questions</h2>`);
    for (const item of article.faq) {
      const q = esc(item.question || item.q || '');
      const a = esc(item.answer   || item.a || '');
      if (q) lines.push(`<h3 style="font-size:1rem;font-weight:700;margin:1rem 0 0.25rem;">${q}</h3>`);
      if (a) lines.push(`<p style="line-height:1.7;margin-bottom:0.75rem;">${a}</p>`);
    }
  }

  // Verdict
  if (article.verdict) {
    lines.push(`<div style="background:var(--bg-secondary,#f8fafc);border:1px solid var(--border,#e2e8f0);padding:1.25rem;border-radius:8px;margin:2rem 0;">`);
    lines.push(`<h2 style="font-size:1.1rem;font-weight:700;margin:0 0 0.5rem;">Our Verdict</h2>`);
    lines.push(`<p style="margin:0;line-height:1.7;">${esc(article.verdict)}</p></div>`);
  }

  // External citations / sources (E-E-A-T signal — Googlebot must see these)
  if (Array.isArray(article.external_citations) && article.external_citations.length) {
    lines.push(`<div style="margin:2rem 0;padding-top:1.5rem;border-top:1px solid var(--border,#e2e8f0);">`);
    lines.push(`<h2 style="font-size:1rem;font-weight:700;margin-bottom:0.75rem;">Sources</h2>`);
    lines.push(`<ul style="margin:0;padding-left:1.2rem;font-size:0.875rem;color:var(--text-secondary,#64748b);">`);
    for (const cite of article.external_citations) {
      const citeTitle     = esc(cite.title || '');
      const citeUrl       = esc(cite.url || '');
      const citePublisher = esc(cite.publisher || '');
      lines.push(`<li style="margin-bottom:0.5rem;">`);
      if (citeUrl) {
        lines.push(`<a href="${citeUrl}" rel="nofollow noopener" target="_blank" style="color:var(--primary,#2563eb);">${citeTitle || citeUrl}</a>`);
      } else {
        lines.push(citeTitle);
      }
      if (citePublisher) lines.push(` — <em>${citePublisher}</em>`);
      lines.push(`</li>`);
    }
    lines.push(`</ul></div>`);
  }

  return lines.join('\n');
}

// ── Meta helpers ──────────────────────────────────────────────────────────────

function articleMeta(article) {
  const title       = `${article.title} | CompareElite`;
  const description = article.excerpt || 'Expert product comparison and buying guide.';
  const url         = `${SITE_URL}/blog/article/${article.slug}`;
  const image       = article.thumbnail || FALLBACK_OG;
  const dateIso     = article.date ? `${article.date}T00:00:00Z` : '';
  const modifiedIso = article.updatedAt ? `${article.updatedAt}T00:00:00Z` : dateIso;
  const section     = article.category || 'Buying Guides';
  const author      = article.author || 'CompareElite Team';
  const keywords    = [article.title, article.category, 'buying guide', 'product comparison', '2026']
    .filter(Boolean)
    .join(', ');
  return { title, description, url, image, dateIso, modifiedIso, section, author, keywords };
}

function applyMeta(template, m, article) {
  let out = template;

  // Inject pre-rendered static content for SEO (replaces skeleton loaders).
  const preHeader  = buildPrerenderedHeader(article);
  const preContent = buildPrerenderedContent(article);

  out = out.replace(
    /<div id="article-header"[^>]*>[\s\S]*?<\/div>/,
    `<div id="article-header" style="text-align: center; margin-bottom: 2rem;">${preHeader}\n        </div>`
  );

  out = out.replace(
    /<article id="article-content">[\s\S]*?<\/article>/,
    `<article id="article-content" data-ssg="true">${preContent}\n        </article>`
  );

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
    [/(<meta property="article:modified_time" content=")[^"]*(" id="og-modified")/,   m.modifiedIso],
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
    // Escape $ in the replacement so substrings like "$199" or "$329" are NOT
    // re-interpreted as backreferences ($1, $3, …) by String.prototype.replace.
    const safe = escapeHtmlAttr(value).replace(/\$/g, '$$$$');
    out = out.replace(pat, `$1${safe}$2`);
  }

  // Inject JSON-LD structured data right before </head>
  const structuredData = generateStructuredDataScripts(article);
  out = out.replace(
    /<\/head>/,
    `\n  <!-- Structured Data (JSON-LD) for SEO -->\n${structuredData}\n</head>`
  );

  // Inject category breadcrumb (SSG — Googlebot reads this directly).
  const CAT_SLUG_MAP = {
    'Tech':         'tech',
    'Home Office':  'home-office',
    'Smart Home':   'smart-home',
    'Home Fitness': 'home-fitness',
  };
  const catSlug  = CAT_SLUG_MAP[article.category] || 'tech';
  const catLabel = escapeHtmlText(article.category || 'Tech');
  out = out.replace(
    /<li id="breadcrumb-category"[^>]*><\/li>/,
    `<li id="breadcrumb-category" style="color:var(--primary);"><a href="/blog/${catSlug}" style="color:var(--primary);">${catLabel}</a></li>`
  );

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
    const html = applyMeta(template, meta, article);
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
