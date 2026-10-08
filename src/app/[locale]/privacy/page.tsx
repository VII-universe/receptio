import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { LegalPage } from '@/components/legal/legal-page'
import { privacyCs, privacyEn } from '@/content/legal/privacy'
import { LEGAL } from '@/lib/legal'

// Texty existují v češtině a angličtině; ostatní jazyky dostanou anglickou verzi s upozorněním.
const docFor = (locale: string) => (locale === 'cs' ? privacyCs(LEGAL) : privacyEn(LEGAL))

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return { title: docFor(locale).title }
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <LegalPage doc={docFor(locale)} locale={locale} translated={locale === 'cs' || locale === 'en'} />
}
