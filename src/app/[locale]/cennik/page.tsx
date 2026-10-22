import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Pricing } from '@/components/marketing/pricing'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteNav } from '@/components/marketing/site-nav'
import { isLocale } from '@/i18n/routing'
import { marketingMetadata } from '@/lib/marketing/metadata'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'marketing.pricing' })
  return marketingMetadata({ locale, path: '/cennik', title: `${t('eyebrow')} | Receptio`, description: `${t('title')} ${t('trial.text')}` })
}

// Veřejná adresa se liší podle jazyka (/pricing, /preise, /tarifs…), viz routing.pathnames.
export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <SiteNav />
      <main id="obsah" data-tone="dark" className="phase-evening flex-1 pt-[4.5rem]">
        <Pricing headingLevel={1} />
      </main>
      <SiteFooter />
    </>
  )
}
