import { setRequestLocale } from 'next-intl/server'
import { Pricing } from '@/components/marketing/pricing'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteNav } from '@/components/marketing/site-nav'

// Veřejná adresa se liší podle jazyka (/pricing, /preise, /tarifs…), viz routing.pathnames.
export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <SiteNav />
      <main id="obsah" className="phase-evening flex-1 pt-[4.5rem]">
        <Pricing headingLevel={1} />
      </main>
      <SiteFooter />
    </>
  )
}
