import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { HtmlLang } from '@/components/html-lang'
import { loadMessages } from '@/i18n/messages'
import { isLocale, LOCALES } from '@/i18n/routing'

// Neznámý jazyk (a Clerkem přepisované adresy pro nepřihlášené) je rovnou 404, stránka se vůbec nevykresluje.
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'landing.meta' })
  return { title: { absolute: t('title') }, description: t('description') }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)
  const messages = await loadMessages(locale)

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLang locale={locale} remember />
      {children}
    </NextIntlClientProvider>
  )
}
