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
    // 1. Determine current page context
    const isHomePage = document.getElementById('home-articles-container');
    const isBlogPage = document.getElementById('blog-articles-container');
    const isArticlePage = document.getElementById('article-content');
    const isDashboardPage = document.getElementById('dashboard-metrics');

    if (isHomePage) {
        await renderHomeArticles();
    } else if (isBlogPage) {
        await renderBlogArticles();
        setupFilters();
    } else if (isArticlePage) {
        await renderArticleDetail();
    } else if (isDashboardPage) {
        await renderDashboard();
    }
});

// Components Rendering Functions
function createArticleCard(article) {
    return `
        <a href="blog/article.html?slug=${article.slug}" class="card">
            <div class="card-img-wrapper">
                <img src="${article.thumbnail || 'https://via.placeholder.com/500x300?text=No+Image'}" alt="${article.title}" class="card-img" loading="lazy">
                <div style="position: absolute; top: 10px; left: 10px;">
                    <span style="background: rgba(0,0,0,0.7); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${article.category}</span>
                </div>
            </div>
            <div class="card-content">
                <div class="card-meta">
                    <span>📅 ${new Date(article.date).toLocaleDateString()}</span>
                    <span>👁️ ${article.stats?.readers || 0}</span>
                </div>
                <h3 class="card-title">${article.title}</h3>
                <p class="card-excerpt">${article.excerpt}</p>
                <div style="margin-top: auto; color: var(--primary); font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 4px;">
                    Read Guide 
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </div>
            </div>
        </a>
    `;
}

async function renderHomeArticles() {
    const container = document.getElementById('home-articles-container');
    const articles = await githubAPI.getArticlesList();
    
    // Take top 6 for homepage
    const featured = articles.slice(0, 6);
    
    if (featured.length === 0) {
        container.innerHTML = `<p>No articles found. Syncing from GitHub...</p>`;
        return;
    }
    
    container.innerHTML = featured.map(createArticleCard).join('');
}

let allArticles = [];
async function renderBlogArticles() {
    const container = document.getElementById('blog-articles-container');
    allArticles = await githubAPI.getArticlesList();
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

    const filterAndSort = () => {
        let filtered = [...allArticles];
        
        // Search
        const query = searchInput.value.toLowerCase();
        if (query) {
            filtered = filtered.filter(a => a.title.toLowerCase().includes(query) || a.excerpt.toLowerCase().includes(query));
        }

        // Category
        const cat = categoryFilter.value;
        if (cat !== 'All') {
            filtered = filtered.filter(a => a.category === cat);
        }

        // Sort
        const sort = sortFilter.value;
        if (sort === 'Latest') {
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (sort === 'Popular') {
            filtered.sort((a, b) => (b.stats?.readers || 0) - (a.stats?.readers || 0));
        }
        
        displayBlogList(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterAndSort);
    if (categoryFilter) categoryFilter.addEventListener('change', filterAndSort);
    if (sortFilter) sortFilter.addEventListener('change', filterAndSort);
}

// Render dynamic article details
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

    const pageUrl = `https://compareelite.com/blog/article?slug=${slug}`;

    // Update title & meta
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

    // Update breadcrumb
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (breadcrumbTitle) breadcrumbTitle.textContent = article.title;

    // Inject JSON-LD: Article + FAQPage + BreadcrumbList
    const faqSchema = article.faq && article.faq.length ? {
        "@type": "FAQPage",
        "mainEntity": article.faq.map(q => ({
            "@type": "Question",
            "name": q.q,
            "acceptedAnswer": { "@type": "Answer", "text": q.a }
        }))
    } : null;

    const schemaGraph = [
        {
            "@type": "Article",
            "@id": `${pageUrl}#article`,
            "headline": article.title,
            "description": article.excerpt,
            "image": article.thumbnail || 'https://compareelite.com/og-image.jpg',
            "datePublished": article.date,
            "dateModified": article.date,
            "author": { "@type": "Organization", "name": "CompareElite", "url": "https://compareelite.com" },
            "publisher": { "@type": "Organization", "name": "CompareElite", "url": "https://compareelite.com" },
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
    if (faqSchema) schemaGraph.push(faqSchema);

    const ldScript = document.createElement('script');
    ldScript.type = 'application/ld+json';
    ldScript.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": schemaGraph });
    document.head.appendChild(ldScript);

    const bodyContent = article.content || buildArticleBody(article);

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

function buildArticleBody(article) {
    const products = article.products || [];
    const faq = article.faq || [];

    const tableRows = products.map((p, i) => `
        <tr style="border-bottom:1px solid var(--border-color);${i % 2 === 1 ? 'background:rgba(37,99,235,0.02);' : ''}">
            <td class="col-product" style="font-weight:600;">${p.name}</td>
            <td class="col-rating" style="text-align:center; color:var(--primary); font-weight:700;">${p.rating}</td>
            <td class="col-price" style="text-align:center; font-weight:600;">${p.price}</td>
            <td class="col-bestfor" style="text-align:center; color:var(--text-secondary);">${p.best_for}</td>
            <td class="col-action" style="text-align:right;">
                <a href="${p.link}" class="btn btn-accent" target="_blank" rel="nofollow noopener" style="white-space:nowrap;">Check Price ↗</a>
            </td>
        </tr>`).join('');

    const productCards = products.map(p => `
        <div class="product-card">
            <div class="product-card-inner">
                <div class="product-card-body">
                    <h3 style="margin-bottom:0.5rem;">${p.name}</h3>
                    <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                        <span style="color:var(--primary); font-weight:700;">${p.rating}</span>
                        <span style="font-weight:600;">${p.price}</span>
                        <span style="background:var(--primary-light); color:var(--primary); padding:2px 10px; border-radius:999px; font-size:0.8rem; font-weight:600;">${p.best_for}</span>
                    </div>
                    ${p.pros ? `<div style="margin-bottom:0.5rem;"><strong>Pros:</strong>${p.pros.map(x => `<div class="pro-item">✓ ${x}</div>`).join('')}</div>` : ''}
                    ${p.cons ? `<div><strong>Cons:</strong>${p.cons.map(x => `<div class="con-item">✗ ${x}</div>`).join('')}</div>` : ''}
                </div>
                <a href="${p.link}" class="btn btn-accent btn-amazon" target="_blank" rel="nofollow noopener" style="padding:0.75rem 1.5rem; white-space:nowrap;">Buy on Amazon ↗</a>
            </div>
        </div>`).join('');

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
        ${productCards}` : ''}
        ${faqHtml}
        <div style="background:var(--primary-light); border-radius:var(--radius-md); padding:1.5rem; margin-top:2rem; text-align:center;">
            <p style="font-weight:600; color:var(--text-primary); margin-bottom:0.5rem;">Found this guide helpful?</p>
            <p style="font-size:0.9rem; margin-bottom:1rem;">All links are Amazon affiliate links. Prices shown are approximate and may change.</p>
        </div>`;
}

function createMockArticleBody(article) {
    return buildArticleBody(article);
}

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
