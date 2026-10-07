import { setRequestLocale } from 'next-intl/server'
import { Navbar } from '@/components/layout/navbar'
import { MarketingFooter } from '@/components/layout/marketing-footer'
import { Pricing } from '@/components/landing/pricing'

// Veřejná adresa se liší podle jazyka (/pricing, /preise, /tarifs…), viz routing.pathnames.
export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-20">
        <Pricing />
      </main>
      <MarketingFooter />
    </div>
  )
}
