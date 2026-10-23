import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { HtmlLang } from '@/components/html-lang'
import { ConsentBanner } from '@/components/marketing/consent-banner'
import { SmoothScroll } from '@/components/marketing/smooth-scroll'
import { loadMessages } from '@/i18n/messages'
import { isLocale, LOCALES } from '@/i18n/routing'
import { CONSENT_COOKIE } from '@/lib/consent'
import { marketingMetadata } from '@/lib/marketing/metadata'
import './marketing.css'

// Písma veřejného webu (dashboard je nenačítá). General Sans: nadpisy v latince (self-host, Fontshare FFL).
const generalSans = localFont({
  src: [{ path: '../fonts/GeneralSans-600.woff2', weight: '600' }],
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

const earlyScript = (locale: string) =>
  `document.documentElement.lang=${JSON.stringify(locale)};` +
  `if(/(^|; )${CONSENT_COOKIE}=/.test(document.cookie))document.documentElement.setAttribute('data-consent','')`

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'marketing.meta' })
  return marketingMetadata({ locale, path: '/', title: t('title'), description: t('description') })
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
  // Do prohlížeče jdou jen texty, které používají klientské komponenty webu (ne celé texty aplikace).
  const { marketing, consent } = await loadMessages(locale)

  return (
    <NextIntlClientProvider locale={locale} messages={{ marketing, consent }}>
      {/* Před prvním vykreslením: jazyk stránky (kořenový layout je společný, lang="cs") a příznak
          uloženého souhlasu, podle kterého se lišta s cookies vůbec neukáže (viz ConsentBanner). */}
      <script dangerouslySetInnerHTML={{ __html: earlyScript(locale) }} />
      <HtmlLang locale={locale} remember />
      <div
        lang={locale}
        data-script={ALT_SCRIPT.has(locale) ? 'alt' : 'latin'}
        className={`mk ${generalSans.variable} ${inter.variable} flex min-h-screen flex-col`}
      >
        <SmoothScroll />
        {children}
        <ConsentBanner />
      </div>
    </NextIntlClientProvider>
  )
}
