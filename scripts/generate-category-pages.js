#!/usr/bin/env node
/**
 * Generate 4 static category hub pages:
 *   blog/tech/index.html
 *   blog/home-office/index.html
 *   blog/smart-home/index.html
 *   blog/home-fitness/index.html
 *
 * Usage: node scripts/generate-category-pages.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const BLOG_DIR     = path.join(ROOT, 'blog');
const SITE_URL     = 'https://compareelite.com';

const CATEGORIES = [
  { name: 'Tech',         slug: 'tech',        emoji: '💻', desc: 'laptops, headphones, cameras, and every gadget in between' },
  { name: 'Home Office',  slug: 'home-office',  emoji: '🖥️', desc: 'desks, chairs, monitors, and everything for a productive workspace' },
  { name: 'Smart Home',   slug: 'smart-home',   emoji: '🏠', desc: 'smart speakers, robot vacuums, thermostats, and connected devices' },
  { name: 'Home Fitness', slug: 'home-fitness',  emoji: '🏋️', desc: 'treadmills, dumbbells, resistance bands, and home gym gear' },
];

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHubPage(cat, articles) {
  const { name, slug, emoji, desc } = cat;
  const count = articles.length;

  const cards = articles.map(a => `
      <article class="hub-card">
        <a href="/blog/article/${esc(a.slug)}" class="hub-card-img-link" tabindex="-1" aria-hidden="true">
          <img src="${esc(a.thumbnail)}" alt="${esc(a.title)}" loading="lazy" width="300" height="200">
        </a>
        <div class="hub-card-body">
          <p class="hub-card-date">${a.dateFormatted}</p>
          <h2 class="hub-card-title"><a href="/blog/article/${esc(a.slug)}">${esc(a.title)}</a></h2>
          <p class="hub-card-excerpt">${esc(a.excerpt)}</p>
          <a href="/blog/article/${esc(a.slug)}" class="hub-card-cta">Read Guide →</a>
        </div>
      </article>`).join('\n');

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/blog/${slug}#webpage`,
    "url": `${SITE_URL}/blog/${slug}`,
    "name": `Best ${name} Buying Guides 2026`,
    "description": `Browse ${count} expert-tested ${name.toLowerCase()} buying guides for 2026.`,
    "isPartOf": { "@id": `${SITE_URL}/#website` },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
        { "@type": "ListItem", "position": 2, "name": "Guides", "item": `${SITE_URL}/blog` },
        { "@type": "ListItem", "position": 3, "name": name, "item": `${SITE_URL}/blog/${slug}` }
      ]
    }
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-QEREG8GBQF"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-QEREG8GBQF');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Best ${esc(name)} Buying Guides 2026 | CompareElite</title>
  <meta name="description" content="Browse ${count} expert-tested ${esc(name.toLowerCase())} buying guides for 2026. In-depth reviews on ${esc(desc)}.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${SITE_URL}/blog/${slug}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/blog/${slug}">
  <meta property="og:title" content="Best ${esc(name)} Buying Guides 2026 | CompareElite">
  <meta property="og:description" content="Browse ${count} expert-tested ${esc(name.toLowerCase())} guides.">
  <meta property="og:image" content="${SITE_URL}/og-image.jpg">
  <meta property="og:site_name" content="CompareElite">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Best ${esc(name)} Buying Guides 2026 | CompareElite">
  <meta name="twitter:description" content="Browse ${count} expert-tested ${esc(name.toLowerCase())} guides.">
  <meta name="twitter:image" content="${SITE_URL}/og-image.jpg">
  <script type="application/ld+json">
${jsonLd}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="/css/style.css">
  <style>
    .hub-hero { background: var(--primary-light, #eff6ff); padding: 3.5rem 0; text-align: center; border-bottom: 1px solid var(--border-color, #e5e7eb); }
    .hub-hero h1 { font-size: 2.4rem; margin: 0 0 0.75rem; }
    .hub-hero p { color: var(--text-secondary, #6b7280); font-size: 1.1rem; max-width: 600px; margin: 0 auto; }
    .hub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; padding: 2.5rem 0; }
    .hub-card { border: 1px solid var(--border-color, #e5e7eb); border-radius: var(--radius, 12px); overflow: hidden; background: var(--bg-surface, #fff); transition: box-shadow 0.2s, transform 0.2s; }
    .hub-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .hub-card img { width: 100%; height: 200px; object-fit: cover; display: block; }
    .hub-card-body { padding: 1.25rem; }
    .hub-card-date { font-size: 0.78rem; color: var(--text-secondary, #6b7280); margin: 0 0 0.4rem; }
    .hub-card-title { font-size: 1rem; font-weight: 700; margin: 0 0 0.5rem; line-height: 1.4; }
    .hub-card-title a { color: var(--text-primary, #111); text-decoration: none; }
    .hub-card-title a:hover { color: var(--primary, #2563eb); }
    .hub-card-excerpt { font-size: 0.85rem; color: var(--text-secondary, #6b7280); margin: 0 0 0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; }
    .hub-card-cta { font-size: 0.85rem; color: var(--primary, #2563eb); font-weight: 600; text-decoration: none; }
    .hub-card-cta:hover { text-decoration: underline; }
    .hub-count { display: inline-block; background: var(--primary, #2563eb); color: #fff; padding: 0.2rem 0.65rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-top: 0.75rem; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="logo" aria-label="CompareElite Home">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        CompareElite
      </a>
      <div class="header-actions">
        <button class="btn btn-outline" style="padding:0.4rem 0.6rem;border:none;font-size:1.2rem;" onclick="toggleTheme()" aria-label="Toggle Dark Mode">🌓</button>
        <button class="hamburger" onclick="toggleMenu()" aria-label="Toggle Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
      <nav class="nav-links" id="nav-menu" aria-label="Main navigation">
        <a href="/" onclick="closeMenu()">Home</a>
        <a href="/blog" onclick="closeMenu()">Guides</a>
        <div class="nav-dropdown" id="nav-categories-dropdown">
          <button class="nav-dropdown-trigger" onclick="toggleDropdown('nav-categories-dropdown')" aria-expanded="false" aria-haspopup="true">
            Categories <span class="nav-caret" aria-hidden="true">▾</span>
          </button>
          <div class="nav-dropdown-menu" role="menu">
            <a href="/blog/tech" onclick="closeMenu()" role="menuitem"${slug === 'tech' ? ' class="active"' : ''}>💻 Tech</a>
            <a href="/blog/home-office" onclick="closeMenu()" role="menuitem"${slug === 'home-office' ? ' class="active"' : ''}>🖥️ Home Office</a>
            <a href="/blog/smart-home" onclick="closeMenu()" role="menuitem"${slug === 'smart-home' ? ' class="active"' : ''}>🏠 Smart Home</a>
            <a href="/blog/home-fitness" onclick="closeMenu()" role="menuitem"${slug === 'home-fitness' ? ' class="active"' : ''}>🏋️ Home Fitness</a>
          </div>
        </div>
        <div class="nav-dropdown" id="nav-brands-dropdown">
          <button class="nav-dropdown-trigger" onclick="toggleDropdown('nav-brands-dropdown')" aria-expanded="false" aria-haspopup="true">
            Brands <span class="nav-caret" aria-hidden="true">▾</span>
          </button>
          <div class="nav-dropdown-menu" role="menu">
            <a href="/brands/apple" onclick="closeMenu()" role="menuitem">🍎 Apple</a>
            <a href="/brands/samsung" onclick="closeMenu()" role="menuitem">📱 Samsung</a>
            <a href="/brands/sony" onclick="closeMenu()" role="menuitem">🎵 Sony</a>
            <a href="/brands/dyson" onclick="closeMenu()" role="menuitem">🌀 Dyson</a>
            <a href="/brands/herman-miller" onclick="closeMenu()" role="menuitem">🪑 Herman Miller</a>
            <a href="/brands/nordictrack" onclick="closeMenu()" role="menuitem">🏃 NordicTrack</a>
            <div class="dropdown-divider"></div>
            <a href="/brands" onclick="closeMenu()" class="dropdown-all-link" role="menuitem">All Brands →</a>
          </div>
        </div>
        <a href="/blog" class="btn btn-primary" onclick="closeMenu()">All Guides</a>
      </nav>
    </div>
  </header>

  <nav aria-label="Breadcrumb" style="background:var(--bg-surface);border-bottom:1px solid var(--border-color);padding:0.75rem 0;">
    <div class="container">
      <ol style="list-style:none;display:flex;gap:0.5rem;font-size:0.875rem;color:var(--text-secondary);margin:0;padding:0;">
        <li><a href="/" style="color:var(--primary);">Home</a></li>
        <li style="opacity:0.5;">/</li>
        <li><a href="/blog" style="color:var(--primary);">Guides</a></li>
        <li style="opacity:0.5;">/</li>
        <li style="color:var(--text-secondary);">${esc(name)}</li>
      </ol>
    </div>
  </nav>

  <div class="hub-hero">
    <div class="container">
      <h1>${emoji} Best ${esc(name)} Buying Guides for 2026</h1>
      <p>Expert-tested guides on ${esc(desc)}.</p>
      <span class="hub-count">${count} guides</span>
    </div>
  </div>

  <main class="container">
    <div class="hub-grid">
      ${cards}
    </div>
  </main>

  <footer style="text-align:center;padding:2.5rem 1rem;color:var(--text-secondary);font-size:0.875rem;border-top:1px solid var(--border-color);margin-top:1rem;">
    <p>© 2026 CompareElite · <a href="/about" style="color:var(--primary);">About</a> · <a href="/blog" style="color:var(--primary);">All Guides</a> · <a href="/blog/tech" style="color:var(--primary);">Tech</a> · <a href="/blog/home-office" style="color:var(--primary);">Home Office</a> · <a href="/blog/smart-home" style="color:var(--primary);">Smart Home</a> · <a href="/blog/home-fitness" style="color:var(--primary);">Home Fitness</a></p>
  </footer>

  <script src="/js/main.js"></script>
</body>
</html>`;
}

function main() {
  const files = fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'TEMPLATE.json');

  const allArticles = [];
  for (const f of files) {
    try {
      const a = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf8'));
      if (!a.category) continue;
      const dateObj = a.date ? new Date(a.date) : null;
      allArticles.push({
        slug:          a.slug || f.replace('.json', ''),
        title:         a.title || '',
        excerpt:       a.excerpt || '',
        thumbnail:     a.thumbnail || `${SITE_URL}/og-image.jpg`,
        category:      a.category,
        date:          a.date || '',
        dateFormatted: dateObj ? dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
      });
    } catch (_) {}
  }

  // Sort by date descending
  allArticles.sort((a, b) => b.date.localeCompare(a.date));

  for (const cat of CATEGORIES) {
    const catArticles = allArticles.filter(a => a.category === cat.name);
    const outDir = path.join(BLOG_DIR, cat.slug);
    fs.mkdirSync(outDir, { recursive: true });
    const html = buildHubPage(cat, catArticles);
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    console.log(`Generated blog/${cat.slug}/index.html (${catArticles.length} articles)`);
  }

  console.log('\nCategory hub pages generated successfully.');
}

main();
