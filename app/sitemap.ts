import { MetadataRoute } from 'next'
import fs from 'node:fs'
import path from 'node:path'

const SITE_URL = 'https://compareelite.com'
const ARTICLES_DIR = path.join(process.cwd(), 'articles')
const VALID_CATEGORIES = ['Tech', 'Home Office', 'Smart Home', 'Home Fitness'] as const

type ArticleEntry = { slug: string; category: string }

function readArticles(): ArticleEntry[] {
  if (!fs.existsSync(ARTICLES_DIR)) return []
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'TEMPLATE.json')
    .map((f) => {
      const filePath = path.join(ARTICLES_DIR, f)
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        return {
          slug: path.basename(f, '.json'),
          category: typeof data?.category === 'string' ? data.category : '',
        }
      } catch {
        return null
      }
    })
    .filter((a): a is ArticleEntry => a !== null)
}

export default function sitemap(): MetadataRoute.Sitemap {
  const today = new Date()
  const articles = readArticles()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: today, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/blog`, lastModified: today, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/affiliate-disclosure`, lastModified: today, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: today, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: today, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const orderedArticles = VALID_CATEGORIES.flatMap((cat) =>
    articles
      .filter((a) => a.category === cat)
      .sort((a, b) => a.slug.localeCompare(b.slug))
  )
  const uncategorized = articles.filter((a) => !VALID_CATEGORIES.includes(a.category as typeof VALID_CATEGORIES[number]))

  const articleEntries: MetadataRoute.Sitemap = [...orderedArticles, ...uncategorized].map((a) => ({
    url: `${SITE_URL}/blog/article?slug=${a.slug}`,
    lastModified: today,
    changeFrequency: 'monthly',
    priority: VALID_CATEGORIES.includes(a.category as typeof VALID_CATEGORIES[number]) ? 0.8 : 0.7,
  }))

  return [...staticPages, ...articleEntries]
}
