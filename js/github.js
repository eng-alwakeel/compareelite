// GitHub Data Integration (Safe, public data only, no tokens)
const GITHUB_REPO = 'eng-alwakeel/compareelite';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

class GitHubAPI {
    constructor() {
        this.baseUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents`;
        this.rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main`;
    }

    _isCacheValid(cacheKey) {
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return false;
        
        try {
            const parsed = JSON.parse(cached);
            const now = new Date().getTime();
            return (now - parsed.timestamp) < CACHE_DURATION;
        } catch (e) {
            return false;
        }
    }

    _getCachedData(cacheKey) {
        try {
            const cached = localStorage.getItem(cacheKey);
            return JSON.parse(cached).data;
        } catch (e) {
            return null;
        }
    }

    _setCachedData(cacheKey, data) {
        const cacheObj = {
            timestamp: new Date().getTime(),
            data: data
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheObj));
    }

    // Since Paperclip writes to /articles/*.json, we get the directory list first
    async getArticlesList() {
        const cacheKey = 'ce_cache_articles_list';
        
        if (this._isCacheValid(cacheKey)) {
            return this._getCachedData(cacheKey);
        }

        try {
            const response = await fetch(`${this.baseUrl}/articles`);
            if (!response.ok) {
                // If the folder doesn't exist yet, return empty or mock data
                if (response.status === 404) return this._getMockArticles();
                throw new Error(`GitHub API Error: ${response.status}`);
            }

            const files = await response.json();
            const jsonFiles = files.filter(f => f.name.endsWith('.json'));
            
            // We want to fetch the content of each JSON file to build our listing.
            // Using rawUrl is better to avoid API rate limits for each individual file.
            const articlesPromises = jsonFiles.map(file => 
                fetch(`${this.rawUrl}/articles/${file.name}`).then(res => res.json()).catch(() => null)
            );
            
            const articles = (await Promise.all(articlesPromises)).filter(a => a !== null);
            
            // Sort by latest
            articles.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            
            this._setCachedData(cacheKey, articles);
            return articles;
        } catch (error) {
            console.error("Failed to fetch articles:", error);
            // Fallback to mock data to ensure website always renders
            return this._getMockArticles();
        }
    }

    async getArticle(slug) {
        const articles = await this.getArticlesList();
        return articles.find(a => a.slug === slug) || null;
    }

    async getProducts() {
        const cacheKey = 'ce_cache_products';
        if (this._isCacheValid(cacheKey)) return this._getCachedData(cacheKey);

        try {
            const response = await fetch(`${this.rawUrl}/products.json`);
            if (!response.ok) throw new Error("Not found");
            const data = await response.json();
            this._setCachedData(cacheKey, data);
            return data;
        } catch (error) {
            return [];
        }
    }

    async getAnalytics() {
        const cacheKey = 'ce_cache_analytics';
        if (this._isCacheValid(cacheKey)) return this._getCachedData(cacheKey);

        try {
            const response = await fetch(`${this.rawUrl}/data/analytics.json`);
            if (!response.ok) throw new Error("Not found");
            const data = await response.json();
            this._setCachedData(cacheKey, data);
            return data;
        } catch (error) {
            return this._getMockAnalytics();
        }
    }

    _getMockArticles() {
        // Mock data to display immediately before Paperclip pushes real ones
        return [
            {
                slug: "best-wireless-earbuds-2026",
                title: "Best Wireless Earbuds of 2026",
                excerpt: "We tested the top 50 wireless earbuds for sound quality, battery life, and comfort. Here is our definitive guide.",
                category: "Technology",
                date: "2026-04-10",
                thumbnail: "https://images.unsplash.com/photo-1590658268037-6f1115ea905a?w=500&q=80",
                author: "Sarah Jenkins",
                stats: { readers: 12500 }
            },
            {
                slug: "top-robot-vacuums",
                title: "Top 5 Robot Vacuums for Pet Hair",
                excerpt: "Struggling with shedding? These robot vacuums will keep your floors spotless with zero effort.",
                category: "Home & Garden",
                date: "2026-04-12",
                thumbnail: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&q=80",
                author: "Mike Thompson",
                stats: { readers: 8300 }
            },
            {
                slug: "best-running-shoes",
                title: "Best Running Shoes for Flat Feet",
                excerpt: "Find the perfect support and cushioning with our lab-tested recommendations for runners with flat feet.",
                category: "Health & Fitness",
                date: "2026-04-15",
                thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
                author: "Dr. Kelly Smith",
                stats: { readers: 21000 }
            }
        ];
    }

    _getMockAnalytics() {
        return {
            revenue: "$12,450",
            traffic: "145,200",
            clicks: "32,100",
            conversions: "3.2%",
            topArticles: [
                { title: "Best Wireless Earbuds of 2026", clicks: 5400, revenue: "$1,200" },
                { title: "Top 5 Robot Vacuums for Pet Hair", clicks: 3100, revenue: "$850" },
                { title: "Best Espresso Machines Under $500", clicks: 2800, revenue: "$640" }
            ]
        };
    }
}

const githubAPI = new GitHubAPI();
