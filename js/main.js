// Mobile Menu
function toggleMenu() {
    const nav = document.getElementById('nav-menu');
    const btn = document.querySelector('.hamburger');
    nav.classList.toggle('open');
    btn.classList.toggle('open');
}

function closeMenu() {
    const nav = document.getElementById('nav-menu');
    const btn = document.querySelector('.hamburger');
    nav.classList.remove('open');
    btn.classList.remove('open');
}

// Close menu on resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMenu();
});

// Theme Initialization
const initTheme = () => {
    const savedTheme = localStorage.getItem('ce_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', defaultTheme);
};
initTheme();

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ce_theme', newTheme);
}

// Main Application Logic
document.addEventListener('DOMContentLoaded', async () => {
    const isHomePage = document.getElementById('home-articles-container');
    const isBlogPage = document.getElementById('blog-articles-container');
    const isArticlePage = document.getElementById('article-content');
    const isDashboardPage = document.getElementById('dashboard-metrics');

    if (isHomePage) {
        await renderHomePage();
    } else if (isBlogPage) {
        await renderBlogArticles();
        setupFilters();
    } else if (isArticlePage) {
        await renderArticleDetail();
    } else if (isDashboardPage) {
        await renderDashboard();
    }
});

// ─── HOME PAGE ────────────────────────────────────────────────────────────────

async function renderHomePage() {
    const articles = await githubAPI.getArticlesList();

    renderHomeCategories(articles);
    renderHomeMostPopular(articles);
    renderHomeLatest(articles);
    initHomeSearch(articles);
}

// Legacy alias kept in case other code calls it
async function renderHomeArticles() {
    return renderHomePage();
}

// Search -----------------------------------------------------------------------
function initHomeSearch(articles) {
    const input = document.getElementById('home-search-input');
    const resultsBox = document.getElementById('home-search-results');
    if (!input || !resultsBox) return;

    const fuse = typeof Fuse !== 'undefined'
        ? new Fuse(articles, {
            keys: [
                { name: 'title', weight: 2 },
                { name: 'excerpt', weight: 1 },
                { name: 'category', weight: 0.5 }
            ],
            threshold: 0.4,
            includeScore: true,
            minMatchCharLength: 2
          })
        : null;

    input.addEventListener('input', () => {
        const query = input.value.trim();
        if (query.length < 2) {
            resultsBox.style.display = 'none';
            resultsBox.innerHTML = '';
            return;
        }

        let results = [];
        if (fuse) {
            results = fuse.search(query).slice(0, 5).map(r => r.item);
        } else {
            const q = query.toLowerCase();
            results = articles
                .filter(a => a.title.toLowerCase().includes(q) || (a.excerpt || '').toLowerCase().includes(q))
                .slice(0, 5);
        }

        if (results.length === 0) {
            resultsBox.innerHTML = '<p class="search-no-results">No guides found. Try a different keyword.</p>';
        } else {
            resultsBox.innerHTML = results.map(a => `
                <a class="search-result-item" href="blog/article.html?slug=${a.slug}">
                    <img src="${a.thumbnail || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&q=60'}"
                         alt="${a.title}" loading="lazy"
                         onerror="this.src='https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&q=60'">
                    <div>
                        <div class="search-result-title">${a.title}</div>
                        <div class="search-result-cat">${a.category}</div>
                    </div>
                </a>
            `).join('');
        }
        resultsBox.style.display = 'block';
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !resultsBox.contains(e.target)) {
            resultsBox.style.display = 'none';
        }
    });

    // Navigate to blog search on Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            window.location.href = `blog/index.html?q=${encodeURIComponent(input.value.trim())}`;
        }
    });
}

// Categories ------------------------------------------------------------------
const HOME_CATEGORIES = [
    {
        name: 'Laptops',
        icon: '💻',
        keywords: ['laptop', 'laptops', 'notebook', 'ultrabook', 'chromebook'],
        href: 'blog/index.html?category=Laptops'
    },
    {
        name: 'Monitors',
        icon: '🖥️',
        keywords: ['monitor', 'monitors', 'display', 'screen'],
        href: 'blog/index.html?category=Monitors'
    },
    {
        name: 'Office Chairs',
        icon: '🪑',
        keywords: ['chair', 'chairs', 'office chair', 'ergonomic chair', 'desk chair'],
        href: 'blog/index.html?category=Office+Chairs'
    }
];

function countArticlesForCategory(articles, keywords) {
    return articles.filter(a => {
        const haystack = ((a.title || '') + ' ' + (a.slug || '') + ' ' + (a.category || '')).toLowerCase();
        return keywords.some(kw => haystack.includes(kw));
    }).length;
}

function renderHomeCategories(articles) {
    const grid = document.getElementById('home-categories-grid');
    if (!grid) return;

    grid.innerHTML = HOME_CATEGORIES.map(cat => {
        const count = countArticlesForCategory(articles, cat.keywords);
        const label = count === 1 ? '1 guide' : `${count} guide${count === 0 ? 's' : 's'}`;
        return `
            <a class="category-card" href="${cat.href}">
                <span class="cat-icon">${cat.icon}</span>
                <h3 class="cat-name">${cat.name}</h3>
                <span class="cat-count">${label}</span>
            </a>
        `;
    }).join('');
}

// Most Popular ----------------------------------------------------------------
function renderHomeMostPopular(articles) {
    const container = document.getElementById('home-popular-container');
    if (!container) return;

    // Sort by readers desc; fall back to newest if all readers are 0
    const sorted = [...articles].sort((a, b) => {
        const diff = (b.stats?.readers || 0) - (a.stats?.readers || 0);
        if (diff !== 0) return diff;
        return new Date(b.date || 0) - new Date(a.date || 0);
    });

    const top3 = sorted.slice(0, 3);
    if (top3.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-secondary);">No guides yet. Check back soon!</p>';
        return;
    }
    container.innerHTML = top3.map(createArticleCard).join('');
}

// Latest Articles (6 newest, 2×3 grid) ----------------------------------------
function renderHomeLatest(articles) {
    const container = document.getElementById('home-articles-container');
    if (!container) return;

    const latest = [...articles]
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 6);

    if (latest.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-secondary);">No articles yet. Check back soon!</p>';
        return;
    }
    container.innerHTML = latest.map(createArticleCard).join('');
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

function createArticleCard(article) {
    return `
        <a href="blog/article.html?slug=${article.slug}" class="card">
            <div class="card-img-wrapper">
                <img src="${article.thumbnail || ''}" alt="${article.title}" class="card-img" loading="lazy" onerror="this.style.display='none'">
                <div style="position: absolute; top: 10px; left: 10px;">
                    <span style="background: rgba(0,0,0,0.7); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${article.category}</span>
                </div>
            </div>
            <div class="card-content">
                <div class="card-meta">
                    <span>📅 ${article.date ? new Date(article.date).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'}) : ''}</span>
                    <span>👁️ ${article.stats?.readers || 0}</span>
                </div>
                <h3 class="card-title">${article.title}</h3>
                <p class="card-excerpt">${article.excerpt || ''}</p>
                <div style="margin-top: auto; color: var(--primary); font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 4px;">
                    Read Guide 
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </div>
            </div>
        </a>
    `;
}

// ─── BLOG PAGE ───────────────────────────────────────────────────────────────

let allArticles = [];
async function renderBlogArticles() {
    const container = document.getElementById('blog-articles-container');
    allArticles = await githubAPI.getArticlesList();

    // Pre-filter by URL params if present
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q') || '';
    const catParam = params.get('category') || '';

    if (qParam) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = qParam;
    }
    if (catParam) {
        const catFilter = document.getElementById('category-filter');
        if (catFilter) catFilter.value = catParam;
    }

    displayBlogList(allArticles);
}

function displayBlogList(articlesList) {
    const container = document.getElementById('blog-articles-container');
    if (articlesList.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 4rem 0;"><h3 style="font-size: 1.5rem; color: var(--text-secondary);">No guides found.</h3></div>`;
        return;
    }
    container.innerHTML = articlesList.map(createArticleCard).join('');
}

function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');

    let fuse = null;

    const filterAndSort = () => {
        let filtered = [...allArticles];

        const query = searchInput ? searchInput.value.trim() : '';
        if (query.length >= 2) {
            if (!fuse && typeof Fuse !== 'undefined') {
                fuse = new Fuse(allArticles, {
                    keys: [
                        { name: 'title', weight: 2 },
                        { name: 'excerpt', weight: 1 },
                        { name: 'category', weight: 0.5 },
                        { name: 'author', weight: 0.3 }
                    ],
                    threshold: 0.4,
                    includeScore: true,
                    minMatchCharLength: 2
                });
            }
            if (fuse) {
                filtered = fuse.search(query).map(r => r.item);
            } else {
                const q = query.toLowerCase();
                filtered = filtered.filter(a =>
                    a.title.toLowerCase().includes(q) ||
                    (a.excerpt || '').toLowerCase().includes(q)
                );
            }
        }

        const cat = categoryFilter ? categoryFilter.value : 'All';
        if (cat !== 'All') {
            filtered = filtered.filter(a => a.category === cat);
        }

        if (!query) {
            const sort = sortFilter ? sortFilter.value : 'Latest';
            if (sort === 'Latest') {
                filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            } else if (sort === 'Popular') {
                filtered.sort((a, b) => (b.stats?.readers || 0) - (a.stats?.readers || 0));
            }
        }

        displayBlogList(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterAndSort);
    if (categoryFilter) categoryFilter.addEventListener('change', filterAndSort);
    if (sortFilter) sortFilter.addEventListener('change', filterAndSort);

    // Apply URL params on load
    const params = new URLSearchParams(window.location.search);
    const hasParams = params.get('q') || params.get('category');
    if (hasParams) filterAndSort();
}

// ─── ARTICLE DETAIL ──────────────────────────────────────────────────────────

async function renderArticleDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const container = document.getElementById('article-content');
    const header = document.getElementById('article-header');
    
    if (!slug) {
        container.innerHTML = `<h1>Article not found.</h1>`;
        return;
    }

    const article = await githubAPI.getArticle(slug);

    if (!article) {
        container.innerHTML = `<h1>Article not found or not synced yet.</h1><p>Running sync with GitHub, check back in a few minutes.</p>`;
        return;
    }

    // Normalize fields that differ between article formats
    article.thumbnail = article.thumbnail || article.featured_image || '';
    article.date = article.date || article.published_at || '';
    article.excerpt = article.excerpt || article.seo?.description || '';
    article.author = article.author || 'CompareElite Team';

    // Normalize faq: may live at content.faq with question/answer keys
    if (!article.faq && article.content?.faq) {
        article.faq = article.content.faq.map(f => ({ q: f.question || f.q, a: f.answer || f.a }));
    }

    // Normalize products: tagline → best_for
    if (article.products) {
        article.products = article.products.map(p => ({
            ...p,
            best_for: p.best_for || p.tagline || ''
        }));
    }

    // If content is an object (not a string), clear it so buildArticleBody is used
    if (article.content && typeof article.content !== 'string') {
        article.content = null;
    }

    const pageUrl = `https://compareelite.com/blog/article?slug=${slug}`;

    document.title = `${article.title} | CompareElite`;
    document.querySelector('meta[name="description"]').setAttribute('content', article.excerpt);
    document.getElementById('og-title').setAttribute('content', `${article.title} | CompareElite`);
    document.getElementById('og-description').setAttribute('content', article.excerpt);
    document.getElementById('og-image').setAttribute('content', article.thumbnail || 'https://compareelite.com/og-image.jpg');
    document.getElementById('og-url').setAttribute('content', pageUrl);
    document.getElementById('tw-title').setAttribute('content', `${article.title} | CompareElite`);
    document.getElementById('tw-description').setAttribute('content', article.excerpt);
    document.getElementById('tw-image').setAttribute('content', article.thumbnail || 'https://compareelite.com/og-image.jpg');
    document.getElementById('canonical-url').setAttribute('href', pageUrl);

    const metaAuthor = document.getElementById('meta-author');
    if (metaAuthor) metaAuthor.setAttribute('content', article.author || 'CompareElite Team');
    const metaKeywords = document.getElementById('meta-keywords');
    if (metaKeywords) {
        const base = [article.title, article.category, 'best', 'review', 'buying guide', 'comparison', '2026'];
        const kw = [...(article.keywords || []), ...base].filter((v, i, a) => a.indexOf(v) === i).join(', ');
        metaKeywords.setAttribute('content', kw);
    }
    const ogPublished = document.getElementById('og-published');
    if (ogPublished) ogPublished.setAttribute('content', article.date || '');
    const ogModified = document.getElementById('og-modified');
    if (ogModified) ogModified.setAttribute('content', article.date || '');
    const ogSection = document.getElementById('og-section');
    if (ogSection) ogSection.setAttribute('content', article.category || 'Buying Guides');

    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (breadcrumbTitle) breadcrumbTitle.textContent = article.title;

    const faqSchema = article.faq && article.faq.length ? {
        "@type": "FAQPage",
        "mainEntity": article.faq.map(q => ({
            "@type": "Question",
            "name": q.q,
            "acceptedAnswer": { "@type": "Answer", "text": q.a }
        }))
    } : null;

    const itemListSchema = article.products && article.products.length ? {
        "@type": "ItemList",
        "@id": `${pageUrl}#itemlist`,
        "name": article.title,
        "description": article.excerpt,
        "url": pageUrl,
        "numberOfItems": article.products.length,
        "itemListElement": article.products.map((p, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": p.name,
            "url": p.link
        }))
    } : null;

    const schemaGraph = [
        {
            "@type": "Article",
            "@id": `${pageUrl}#article`,
            "headline": article.title,
            "description": article.excerpt,
            "image": {
                "@type": "ImageObject",
                "url": article.thumbnail || 'https://compareelite.com/og-image.jpg',
                "width": 1200,
                "height": 630
            },
            "datePublished": article.date,
            "dateModified": article.date,
            "author": { "@type": "Organization", "name": "CompareElite", "url": "https://compareelite.com" },
            "publisher": {
                "@type": "Organization",
                "name": "CompareElite",
                "url": "https://compareelite.com",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://compareelite.com/icon.svg",
                    "width": 32,
                    "height": 32
                }
            },
            "mainEntityOfPage": { "@type": "WebPage", "@id": pageUrl }
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://compareelite.com" },
                { "@type": "ListItem", "position": 2, "name": "Guides", "item": "https://compareelite.com/blog" },
                { "@type": "ListItem", "position": 3, "name": article.title, "item": pageUrl }
            ]
        }
    ];
    if (itemListSchema) schemaGraph.push(itemListSchema);
    if (faqSchema) schemaGraph.push(faqSchema);

    const ldScript = document.createElement('script');
    ldScript.type = 'application/ld+json';
    ldScript.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": schemaGraph });
    document.head.appendChild(ldScript);

    const rawContent = article.content;
    let bodyContent;
    if (!rawContent) {
        bodyContent = buildArticleBody(article);
    } else if (typeof rawContent === 'string') {
        bodyContent = markdownToHTML(rawContent);
    } else {
        bodyContent = buildArticleBody(article);
    }

    header.innerHTML = `
        <div class="badge">${article.category}</div>
        <h1 style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--text-primary); line-height:1.2;">${article.title}</h1>
        <div style="display:flex; gap:1.5rem; color:var(--text-secondary); margin-bottom:2rem; flex-wrap:wrap; justify-content:center; font-size:0.95rem;">
            <span>By <strong>${article.author || 'CompareElite Team'}</strong></span>
            <span>📅 ${new Date(article.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</span>
            <span>⏱️ ${Math.ceil((article.products?.length || 3) * 2)} min read</span>
        </div>
        <img src="${article.thumbnail || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80'}" alt="${article.title}" style="width:100%; border-radius:var(--radius-lg); margin-bottom:3rem; box-shadow:var(--shadow-md);" loading="eager">
    `;

    container.innerHTML = bodyContent;
}

function markdownToHTML(md) {
    if (!md || typeof md !== 'string') return '';
    let lines = md.split('\n');
    let html = '';
    let i = 0;

    while (i < lines.length) {
        let line = lines[i];

        // Table detection
        if (i + 1 < lines.length && /^\|/.test(line) && /^\|[\s\-|:]+\|/.test(lines[i + 1])) {
            const headers = line.split('|').map(h => h.trim()).filter(Boolean);
            i += 2; // skip header and separator
            let rows = [];
            while (i < lines.length && /^\|/.test(lines[i])) {
                rows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean));
                i++;
            }
            html += `<table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:0.9rem;">`;
            html += `<thead><tr>${headers.map(h => `<th style="padding:0.6rem;background:var(--primary);color:#fff;text-align:left;">${inlineMarkdown(h)}</th>`).join('')}</tr></thead>`;
            html += `<tbody>${rows.map((r, ri) => `<tr style="${ri%2?'background:rgba(0,0,0,0.02)':''}">${r.map(c => `<td style="padding:0.6rem;border-bottom:1px solid var(--border-color);">${inlineMarkdown(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
            html += '</table>';
            continue;
        }

        // Headings
        if (/^### /.test(line)) { html += `<h3 style="font-size:1.2rem;margin:1.5rem 0 0.5rem;">${inlineMarkdown(line.slice(4))}</h3>`; i++; continue; }
        if (/^## /.test(line))  { html += `<h2 style="font-size:1.5rem;margin:2rem 0 0.75rem;padding-top:1rem;border-top:2px solid var(--border-color);">${inlineMarkdown(line.slice(3))}</h2>`; i++; continue; }
        if (/^# /.test(line))   { i++; continue; } // skip H1 — already in page header

        // Horizontal rule
        if (/^---+$/.test(line.trim())) { html += '<hr style="margin:2rem 0;border:none;border-top:1px solid var(--border-color);">'; i++; continue; }

        // Blockquote
        if (/^> /.test(line)) { html += `<blockquote style="border-left:4px solid var(--primary);padding:0.5rem 1rem;margin:1rem 0;color:var(--text-secondary);font-style:italic;">${inlineMarkdown(line.slice(2))}</blockquote>`; i++; continue; }

        // Unordered list
        if (/^[-*] /.test(line)) {
            html += '<ul style="padding-left:1.5rem;margin:0.75rem 0;">';
            while (i < lines.length && /^[-*] /.test(lines[i])) {
                html += `<li style="margin:0.3rem 0;">${inlineMarkdown(lines[i].slice(2))}</li>`;
                i++;
            }
            html += '</ul>';
            continue;
        }

        // Empty line
        if (line.trim() === '') { i++; continue; }

        // Paragraph
        let para = [];
        while (i < lines.length && lines[i].trim() !== '' && !/^[#>|*-]/.test(lines[i]) && !/^---+$/.test(lines[i].trim())) {
            para.push(lines[i]);
            i++;
        }
        if (para.length) html += `<p style="margin:0.75rem 0;line-height:1.7;">${inlineMarkdown(para.join(' '))}</p>`;
    }
    return html;
}

function inlineMarkdown(text) {
    return text
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:1rem 0;display:block;">')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="nofollow noopener" style="color:var(--primary);">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function buildArticleBody(article) {
    const products = article.products || [];
    const faq = article.faq || [];

    const sorted = [...products].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

    function ratingToStars(ratingStr) {
        const raw = parseFloat(ratingStr);
        const stars = raw > 5 ? raw / 2 : raw;
        let html = '';
        for (let i = 1; i <= 5; i++) {
            const cls = stars >= i ? 'full' : stars >= i - 0.5 ? 'half' : 'empty';
            html += `<span class="pstar ${cls}">★</span>`;
        }
        return html;
    }

    function getAmazonImg(link) {
        const m = link.match(/\/dp\/([A-Z0-9]{10})/);
        return m ? `https://images-na.ssl-images-amazon.com/images/P/${m[1]}.01.LZZZZZZZ.jpg` : '';
    }

    const tableRows = sorted.map((p, i) => `
        <tr style="border-bottom:1px solid var(--border-color);${i % 2 === 1 ? 'background:rgba(37,99,235,0.02);' : ''}">
            <td class="col-product" style="font-weight:600;">${p.name}</td>
            <td class="col-rating" style="text-align:center; color:var(--primary); font-weight:700;">${p.rating}</td>
            <td class="col-price" style="text-align:center; font-weight:600;">${p.price}</td>
            <td class="col-bestfor" style="text-align:center; color:var(--text-secondary);">${p.best_for}</td>
            <td class="col-action" style="text-align:right;">
                <a href="${p.link}" class="btn btn-accent" target="_blank" rel="nofollow noopener" style="white-space:nowrap;">Check Price ↗</a>
            </td>
        </tr>`).join('');

    const productCards = sorted.map(p => {
        const imgUrl = p.image || getAmazonImg(p.link);
        const tags = (p.pros || []).slice(0, 3).map(x => `<span class="ptag">${x}</span>`).join('');
        return `
        <div class="pcard">
            <div class="pcard-img">
                <img src="${imgUrl}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">
            </div>
            <div class="pcard-body">
                <div class="pcard-stars">${ratingToStars(p.rating)}<span class="pcard-score">${p.rating}</span></div>
                <h3 class="pcard-name">${p.name}</h3>
                <div class="pcard-price">${p.price}</div>
                <span class="pcard-badge">${p.best_for}</span>
                ${tags ? `<div class="pcard-tags">${tags}</div>` : ''}
                <a href="${p.link}" class="btn btn-accent pcard-btn" target="_blank" rel="nofollow noopener">Buy on Amazon ↗</a>
            </div>
        </div>`;
    }).join('');

    const faqHtml = faq.length ? `
        <h2>Frequently Asked Questions</h2>
        ${faq.map(q => `
        <div style="margin-bottom:1.5rem;">
            <h4 style="margin-bottom:0.5rem; color:var(--text-primary);">${q.q}</h4>
            <p>${q.a}</p>
        </div>`).join('')}` : '';

    return `
        <div style="font-size:1.1rem; line-height:1.8; color:var(--text-secondary); margin-bottom:2rem;">
            <p>${article.excerpt}</p>
            <p>Our team spent dozens of hours researching, comparing specs, and reading thousands of verified buyer reviews to bring you this guide.</p>
        </div>
        ${products.length ? `
        <h2>Top Picks at a Glance</h2>
        <div class="picks-table-wrapper">
            <table class="picks-table">
                <thead>
                    <tr style="background:var(--bg-main); border-bottom:2px solid var(--border-color);">
                        <th class="col-product" style="text-align:left;">Product</th>
                        <th class="col-rating" style="text-align:center;">Rating</th>
                        <th class="col-price" style="text-align:center;">Price</th>
                        <th class="col-bestfor" style="text-align:center;">Best For</th>
                        <th class="col-action" style="text-align:right;">Action</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
        <h2>Detailed Reviews</h2>
        <div class="pcards-grid">${productCards}</div>` : ''}
        ${faqHtml}
        <div style="background:var(--primary-light); border-radius:var(--radius-md); padding:1.5rem; margin-top:2rem; text-align:center;">
            <p style="font-weight:600; color:var(--text-primary); margin-bottom:0.5rem;">Found this guide helpful?</p>
            <p style="font-size:0.9rem; margin-bottom:1rem;">All links are Amazon affiliate links. Prices shown are approximate and may change.</p>
        </div>`;
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

async function renderDashboard() {
    const analytics = await githubAPI.getAnalytics();
    
    document.getElementById('dash-revenue').textContent = analytics.revenue;
    document.getElementById('dash-traffic').textContent = analytics.traffic;
    document.getElementById('dash-clicks').textContent = analytics.clicks;
    document.getElementById('dash-conversions').textContent = analytics.conversions;

    const tbody = document.getElementById('dash-top-articles');
    if (analytics.topArticles && analytics.topArticles.length > 0) {
        tbody.innerHTML = analytics.topArticles.map((art, idx) => `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 1rem; font-weight: 500;">${idx + 1}. ${art.title}</td>
                <td style="padding: 1rem; text-align: center;">${art.clicks}</td>
                <td style="padding: 1rem; text-align: right; color: var(--success); font-weight: 600;">${art.revenue}</td>
            </tr>
        `).join('');
    }
}
