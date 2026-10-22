import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CookieBanner } from '@/components/consent/cookie-banner'
import { HtmlLang } from '@/components/html-lang'
import { loadMessages } from '@/i18n/messages'
import { isLocale, LOCALES } from '@/i18n/routing'
import './marketing.css'

// Písma veřejného webu (dashboard je nenačítá). General Sans: nadpisy v latince (self-host, Fontshare FFL).
const generalSans = localFont({
  src: [
    { path: '../fonts/GeneralSans-500.woff2', weight: '500' },
    { path: '../fonts/GeneralSans-600.woff2', weight: '600' },
  ],
  variable: '--font-general',
  display: 'swap',
})
// Inter: text ve všech jazycích a nadpisy v cyrilici a řečtině. Přednačítá se jen latinka,
// cyrilice a řečtina se stáhnou podle unicode-range až na stránkách, které je potřebují.
const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' })

/** Jazyky, jejichž písmo General Sans nemá (nadpisy sází Inter, viz .mk[data-script='alt']). */
const ALT_SCRIPT = new Set(['bg', 'el'])

// Neznámý jazyk (a Clerkem přepisované adresy pro nepřihlášené) je rovnou 404, stránka se vůbec nevykresluje.
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'marketing.meta' })
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
      <div
        lang={locale}
        data-script={ALT_SCRIPT.has(locale) ? 'alt' : 'latin'}
        className={`mk ${generalSans.variable} ${inter.variable} flex min-h-screen flex-col`}
      >
        {children}
      </div>
      <CookieBanner />
    </NextIntlClientProvider>
  )
}
