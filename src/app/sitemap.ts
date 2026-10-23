import type { MetadataRoute } from 'next'
import { localizedPath, pageAlternates, pageLocales, SITE_URL, type MarketingPath } from '@/lib/marketing/site'

// Veřejný web ve všech jazycích; každá adresa nese i odkazy na své jazykové verze (hreflang).
const PAGES: { path: MarketingPath; priority: number }[] = [
  { path: '/', priority: 1 },
  { path: '/cennik', priority: 0.8 },
  { path: '/privacy', priority: 0.2 },
  { path: '/terms', priority: 0.2 },
  { path: '/cookies', priority: 0.2 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap(({ path, priority }) =>
    pageLocales(path).map((locale) => {
      const { languages } = pageAlternates(path, locale)
      return {
        url: SITE_URL + localizedPath(path, locale),
        changeFrequency: 'monthly' as const,
        priority,
        alternates: { languages: Object.fromEntries(Object.entries(languages).map(([l, p]) => [l, SITE_URL + p])) },
      }
    })
  )
}
