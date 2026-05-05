# CompareElite Technical Architecture

## Overview

CompareElite is an automated Amazon affiliate content publishing platform built on Next.js, designed to generate passive income through SEO-optimized product reviews and comparisons.

## System Architecture

### Technology Stack

- **Frontend Framework**: Next.js 15 (React)
- **Styling**: Tailwind CSS, shadcn/ui components
- **Deployment**: Vercel
- **Content Management**: Git-based (JSON articles)
- **CI/CD**: GitHub Actions
- **Content Generation**: Claude Code CLI + custom skills
- **Search Integration**: IndexNow for rapid indexing

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Content Pipeline                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Director │───▶│  Editor  │───▶│ Reviewer │              │
│  │  Skill   │    │  Skill   │    │  Skill   │              │
│  └──────────┘    └──────────┘    └──────────┘              │
│                         │               │                    │
│                         ▼               ▼                    │
│                   ┌──────────────────────┐                  │
│                   │   Publisher Skill    │                  │
│                   └──────────────────────┘                  │
│                            │                                 │
│                            ▼                                 │
│  ┌────────────────────────────────────────┐                │
│  │      GitHub Repository (Main)          │                │
│  │  - Articles (JSON)                     │                │
│  │  - Validation scripts                  │                │
│  │  - Skills (v3 contract-based)          │                │
│  └────────────────────────────────────────┘                │
│                            │                                 │
│                            ▼                                 │
│  ┌────────────────────────────────────────┐                │
│  │       GitHub Actions CI/CD             │                │
│  │  - Schema validation                   │                │
│  │  - Image liveness checks               │                │
│  │  - Amazon link validation              │                │
│  │  - Manifest generation                 │                │
│  │  - Sitemap regeneration                │                │
│  │  - IndexNow notifications              │                │
│  └────────────────────────────────────────┘                │
│                            │                                 │
│                            ▼                                 │
│  ┌────────────────────────────────────────┐                │
│  │         Vercel Hosting                 │                │
│  │  - Static site generation              │                │
│  │  - CDN distribution                    │                │
│  │  - Dynamic article pages               │                │
│  │  - SEO optimization                    │                │
│  └────────────────────────────────────────┘                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Content Workflow

### Article Generation (Daily)

1. **Scheduler**: GitHub Action runs daily at 8:00 AM KSA
2. **Director**: Plans 4 articles for the day
3. **Editor**: Generates article content with Amazon affiliate links
4. **Reviewer**: Validates against 80-point quality checklist
5. **Publisher**: Commits approved articles to repository

### Validation Gates (Hard Gates)

Before any article is pushed to production:

1. **Schema Validation**: JSON structure, required fields, image liveness
2. **Amazon Link Validation**: All product links must resolve (no 404s)

Articles failing validation are rejected and not pushed.

### Post-Publish Automation

On every push to main:

1. **Manifest Update**: Regenerate articles-manifest.json
2. **Sitemap Generation**: Update sitemap.xml with new URLs
3. **Article Index**: Rebuild articles-index.md
4. **Static Pages**: Generate per-article HTML pages
5. **IndexNow**: Notify search engines of new/updated content

## Data Models

### Article Schema (articles/*.json)

```json
{
  "slug": "best-product-2026",
  "title": "Best Product 2026",
  "excerpt": "140-170 character summary",
  "category": "tech|home-office|smart-home|home-fitness",
  "body": "Full article content (markdown)",
  "products": [
    {
      "asin": "B0XXXXXXXX",
      "title": "Product Name",
      "description": "...",
      "affiliateLink": "https://amazon.com/dp/B0XX?tag=compareelite-20",
      "imageUrl": "https://m.media-amazon.com/...",
      "rating": 4.5,
      "price": "$999.99",
      "pros": ["..."],
      "cons": ["..."],
      "rank": 1
    }
  ],
  "seo": {
    "title": "SEO title",
    "description": "Meta description",
    "keywords": ["keyword1", "keyword2"]
  },
  "faq": [
    {
      "question": "...",
      "answer": "..."
    }
  ],
  "type": "comparison|review|guide",
  "publishedAt": "2026-05-05",
  "updatedAt": "2026-05-05"
}
```

## Claude Skills (v3 Contract-Based)

Located in `skills/` directory:

- **director**: Plans content calendar, assigns articles
- **editor**: Generates article content with affiliate links
- **reviewer**: Validates quality (80-point checklist)
- **publisher**: Commits approved articles to GitHub
- **analytics**: Tracks performance metrics

## Validation Scripts

- `scripts/validate-article.js`: Schema + image liveness
- `scripts/validate-amazon-links.js`: Amazon link validation
- `scripts/generate-sitemap.js`: Sitemap generation
- `scripts/generate-articles-index.js`: Index page generation
- `scripts/generate-article-pages.js`: Static HTML generation
- `scripts/notify-indexnow.js`: IndexNow API integration

## Deployment

- **Platform**: Vercel
- **Framework**: Next.js (static export)
- **Build**: Automatic on push to main
- **CDN**: Vercel Edge Network
- **Custom Domain**: (TBD)

## SEO Strategy

1. **On-Page SEO**: Meta tags, structured data, semantic HTML
2. **Technical SEO**: Sitemap, robots.txt, clean URLs
3. **Content SEO**: Long-form comparison articles (2000+ words)
4. **Indexing**: IndexNow for rapid search engine discovery
5. **Internal Linking**: Category pages, related articles

## Affiliate Strategy

- **Amazon Associate Tag**: compareelite-20
- **Link Format**: `https://amazon.com/dp/{ASIN}?tag=compareelite-20`
- **Disclosure**: Affiliate disclosure on all pages
- **Compliance**: FTC guidelines, GDPR, Amazon TOS

## Security & Compliance

- **Secrets Management**: GitHub Secrets for API keys
- **Token Permissions**: Fine-grained GitHub PAT
- **Data Privacy**: No user data collection (static site)
- **HTTPS**: Enforced via Vercel
- **CSP**: Content Security Policy headers

## Performance

- **Static Generation**: Pre-rendered pages for speed
- **Image Optimization**: Amazon CDN for product images
- **Code Splitting**: Next.js automatic code splitting
- **CDN**: Vercel Edge Network (global distribution)

## Monitoring & Analytics

- **Google Analytics**: Traffic and conversion tracking
- **Google Search Console**: Search performance
- **GitHub Actions**: Build/validation logs
- **Vercel Analytics**: Performance monitoring

## Development Workflow

1. **Local Development**: Clone repo, run `npm run dev`
2. **Content Creation**: Use Claude skills via `/daily-articles`
3. **Testing**: Run validation scripts locally
4. **Deployment**: Push to main → Vercel auto-deploys

## Technical Decisions

### Why Git-Based CMS?

- Version control for all content
- Automated workflows with GitHub Actions
- No database overhead
- Easy rollback/recovery
- Transparent change history

### Why Next.js?

- SEO-friendly (SSR/SSG)
- React ecosystem
- Vercel integration
- Performance optimizations
- Developer experience

### Why JSON for Articles?

- Structured data for validation
- Easy programmatic manipulation
- Type safety with schemas
- Claude-friendly format

### Why Vercel?

- Zero-config deployment
- Global CDN
- Automatic HTTPS
- Preview deployments
- Analytics included

## Future Enhancements

- [ ] A/B testing for article templates
- [ ] Automated content freshness updates
- [ ] Category page generation
- [ ] Search functionality
- [ ] Newsletter integration
- [ ] Affiliate link click tracking
- [ ] Product price monitoring
- [ ] Related articles algorithm

## Troubleshooting

### Build Failures

- Check GitHub Actions logs
- Verify secrets are set (ANTHROPIC_API_KEY)
- Run validation scripts locally

### Validation Failures

- Schema errors: Check article JSON structure
- Image 404s: Verify Amazon image URLs
- Amazon link errors: Check ASIN validity

### Deployment Issues

- Vercel logs: Check build/runtime logs
- DNS: Verify domain configuration
- Cache: Clear Vercel cache if stale

---

**Last Updated**: 2026-05-05 by CTO  
**Repository**: https://github.com/eng-alwakeel/compareelite  
**Deployed Site**: (TBD - Vercel URL)
