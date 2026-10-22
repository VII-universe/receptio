import { setRequestLocale } from 'next-intl/server'
import { Calculator } from '@/components/marketing/calculator'
import { DemoPlayerProvider } from '@/components/marketing/demo-player'
import { DayStory } from '@/components/marketing/day-story'
import { Faq } from '@/components/marketing/faq'
import { FinalCta } from '@/components/marketing/final-cta'
import { Hero } from '@/components/marketing/hero'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { Industries } from '@/components/marketing/industries'
import { Pricing } from '@/components/marketing/pricing'
import { Security } from '@/components/marketing/security'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteNav } from '@/components/marketing/site-nav'
import { VoiceSection } from '@/components/marketing/voice-section'
import { getDemoSources } from '@/lib/marketing/demo-audio'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <SiteNav />
      <main id="obsah" className="flex-1">
        <DemoPlayerProvider sources={getDemoSources(locale)}>
          <Hero />
          <DayStory />
          <HowItWorks />
          <Industries />
        </DemoPlayerProvider>
        <VoiceSection />
        <Calculator />
        <Pricing />
        <Security />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  )
}
