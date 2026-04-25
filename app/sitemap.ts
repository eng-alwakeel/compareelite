import { MetadataRoute } from 'next'

export const revalidate = 3600 // re-fetch every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs: string[] = []

  try {
    const res = await fetch(
      'https://api.github.com/repos/eng-alwakeel/compareelite/contents/articles',
      {
        headers: { Accept: 'application/vnd.github+json' },
        next: { revalidate: 3600 },
      }
    )
    if (res.ok) {
      const files: { name: string }[] = await res.json()
      slugs = files
        .filter(f => f.name.endsWith('.json'))
        .map(f => f.name.replace('.json', ''))
    }
  } catch {
    // fall through with empty slugs — static pages still included
  }

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
