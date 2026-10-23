import type { Metadata } from 'next'
import type { Locale } from '@/i18n/routing'
import { SITE_URL, ogLocale, pageAlternates, type MarketingPath } from './site'

/**
 * Metadata stránky veřejného webu: titulek, popis, kanonická adresa, hreflang, Open Graph a karta pro X.
 * Obrázek pro sdílení generuje app/[locale]/opengraph-image.tsx.
 */
export function marketingMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale
  path: MarketingPath
  /** Celý titulek (bez šablony „| Receptio“). */
  title: string
  description?: string
}): Metadata {
  const alternates = pageAlternates(path, locale)
  // Podstránka svým openGraph přepíše ten z layoutu i s obrázkem, proto ho uvádíme výslovně.
  const images = [{ url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: 'Receptio' }]
  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: title },
    description,
    alternates,
    openGraph: { type: 'website', siteName: 'Receptio', locale: ogLocale(locale), url: alternates.canonical, title, description, images },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}
