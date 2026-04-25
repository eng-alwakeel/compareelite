import { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'

export default function sitemap(): MetadataRoute.Sitemap {
  const articlesDir = path.join(process.cwd(), 'articles')
  const slugs = fs.readdirSync(articlesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))

  const articleEntries: MetadataRoute.Sitemap = slugs.map(slug => ({
    url: `https://compareelite.com/blog/article?slug=${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [
    { url: 'https://compareelite.com/', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://compareelite.com/blog', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...articleEntries,
    { url: 'https://compareelite.com/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: 'https://compareelite.com/terms', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: 'https://compareelite.com/affiliate-disclosure', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ]
}
