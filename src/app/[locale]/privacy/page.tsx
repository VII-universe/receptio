import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { LegalPage } from '@/components/legal/legal-page'
import { privacyCs, privacyEn } from '@/content/legal/privacy'
import { isLocale } from '@/i18n/routing'
import { LEGAL } from '@/lib/legal'
import { marketingMetadata } from '@/lib/marketing/metadata'

// Texty existují v češtině a angličtině; ostatní jazyky dostanou anglickou verzi s upozorněním.
const docFor = (locale: string) => (locale === 'cs' ? privacyCs(LEGAL) : privacyEn(LEGAL))

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return marketingMetadata({ locale, path: '/privacy', title: `${docFor(locale).title} | Receptio` })
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <LegalPage doc={docFor(locale)} locale={locale} translated={locale === 'cs' || locale === 'en'} />
}
