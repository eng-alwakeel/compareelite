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

    // Set Header Info
    document.title = `${article.title} | CompareElite`;
    // We adjust the path assuming the articles fetched have the body, if not we show mock body
    const bodyContent = article.content || createMockArticleBody(article);
    
    header.innerHTML = `
        <div class="badge">${article.category}</div>
        <h1 class="article-title" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--text-primary);">${article.title}</h1>
        <div class="article-meta" style="display: flex; gap: 1.5rem; color: var(--text-secondary); margin-bottom: 2rem;">
            <span>By <strong>${article.author || 'CompareElite Team'}</strong></span>
            <span>📅 ${new Date(article.date).toLocaleDateString()}</span>
            <span>⏱️ 10 min read</span>
        </div>
        <img src="${article.thumbnail || 'https://via.placeholder.com/1200x600?text=No+Image'}" alt="${article.title}" style="width: 100%; border-radius: var(--radius-lg); margin-bottom: 3rem; box-shadow: var(--shadow-md);">
    `;

    container.innerHTML = bodyContent;
}

function createMockArticleBody(article) {
    return `
        <div style="font-size: 1.1rem; line-height: 1.8; color: var(--text-primary); margin-bottom: 3rem;">
            <p>${article.excerpt}</p>
            <p>Welcome to our comprehensive guide. Our experts spent over 120 hours testing and researching to bring you the best options on the market.</p>
        </div>
        
        <h2>Top Recommendations</h2>
        <div class="comparison-table-wrapper" style="overflow-x: auto; margin: 2rem 0;">
            <table class="comparison-table" style="width: 100%; border-collapse: collapse; min-width: 600px;">
                <thead>
                    <tr style="background-color: var(--bg-main); border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 1rem; text-align: left;">Product</th>
                        <th style="padding: 1rem; text-align: center;">Rating</th>
                        <th style="padding: 1rem; text-align: center;">Best For</th>
                        <th style="padding: 1rem; text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 1.5rem 1rem; font-weight: 600;">Top Pick Product X</td>
                        <td style="padding: 1.5rem 1rem; text-align: center; color: var(--primary);">9.8/10</td>
                        <td style="padding: 1.5rem 1rem; text-align: center;">Overall Value</td>
                        <td style="padding: 1.5rem 1rem; text-align: right;"><a href="#" class="btn btn-accent" target="_blank">Check Amazon</a></td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color); background-color: rgba(37,99,235,0.02);">
                        <td style="padding: 1.5rem 1rem; font-weight: 600;">Premium Product Y</td>
                        <td style="padding: 1.5rem 1rem; text-align: center; color: var(--primary);">9.5/10</td>
                        <td style="padding: 1.5rem 1rem; text-align: center;">High-End Features</td>
                        <td style="padding: 1.5rem 1rem; text-align: right;"><a href="#" class="btn btn-accent" target="_blank">Check Amazon</a></td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 1.5rem 1rem; font-weight: 600;">Budget Pick Z</td>
                        <td style="padding: 1.5rem 1rem; text-align: center; color: var(--primary);">8.9/10</td>
                        <td style="padding: 1.5rem 1rem; text-align: center;">Affordability</td>
                        <td style="padding: 1.5rem 1rem; text-align: right;"><a href="#" class="btn btn-accent" target="_blank">Check Amazon</a></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <h2>Detailed Reviews</h2>
        <div style="margin-bottom: 3rem; padding: 2rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <h3>Top Pick Product X</h3>
            <p style="margin-top: 1rem;">This product exceeded our expectations in every testing category. The battery life is phenomenal, and the build quality feels extremely premium.</p>
            <ul style="margin-top: 1rem; padding-left: 1.5rem;">
                <li>Excellent durability</li>
                <li>Long-lasting battery</li>
                <li>Top-tier customer support</li>
            </ul>
        </div>

        <h2>FAQ</h2>
        <div style="margin-top: 2rem;">
            <h4 style="margin-bottom: 0.5rem;">What is the most important feature to look for?</h4>
            <p style="margin-bottom: 1.5rem;">Battery life and durable materials are key indicators of a product that will last.</p>
            
            <h4 style="margin-bottom: 0.5rem;">Do these products come with a warranty?</h4>
            <p style="margin-bottom: 1.5rem;">Yes, all the products featured in our guide come with at least a 1-year manufacturer warranty.</p>
        </div>
    `;
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
