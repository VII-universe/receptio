import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { LegalPage } from '@/components/legal/legal-page'
import { termsCs, termsEn } from '@/content/legal/terms'
import { LEGAL } from '@/lib/legal'

// Texty existují v češtině a angličtině; ostatní jazyky dostanou anglickou verzi s upozorněním.
const docFor = (locale: string) => (locale === 'cs' ? termsCs(LEGAL) : termsEn(LEGAL))

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return { title: docFor(locale).title }
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <LegalPage doc={docFor(locale)} locale={locale} translated={locale === 'cs' || locale === 'en'} />
}
