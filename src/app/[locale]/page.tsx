import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { Navbar } from '@/components/layout/navbar'
import { MarketingFooter } from '@/components/layout/marketing-footer'
import { Pricing } from '@/components/landing/pricing'
import { RoiCalculator } from '@/components/landing/roi-calculator'

const STEPS = ['step1', 'step2', 'step3'] as const
const USE_CASES = [
  { key: 'restaurant', icon: '🍽️' },
  { key: 'dental', icon: '🦷' },
  { key: 'auto', icon: '🔧' },
  { key: 'beauty', icon: '✂️' },
] as const

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('landing')

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{t('hero.title')}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">{t('hero.subtitle')}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className={buttonVariants({ size: 'lg' })}>
              {t('nav.tryFree')}
            </Link>
            <Link href="/sign-in" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
              {t('nav.signIn')}
            </Link>
          </div>
          <p className="mt-4 text-sm font-medium">{t('hero.trial')}</p>
          <p className="mt-4 text-sm text-muted-foreground">{t('hero.suitable')}</p>
        </section>

        {/* Jak to funguje */}
        <section id="jak-to-funguje" className="scroll-mt-20 border-t bg-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">{t('how.title')}</h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="text-xl font-semibold">{t(`how.${s}Title`)}</h3>
                  <p className="text-muted-foreground">{t(`how.${s}Text`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ROI kalkulačka */}
        <section id="kalkulacka" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">{t('roi.title')}</h2>
            <RoiCalculator />
          </div>
        </section>

        {/* Ceník */}
        <section id="cenik" className="scroll-mt-20 border-t bg-muted/40 py-20">
          <Pricing />
        </section>

        {/* Použití */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">{t('cases.title')}</h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {USE_CASES.map((u) => (
                <div key={u.key} className="rounded-2xl border p-6">
                  <div className="text-3xl" aria-hidden>
                    {u.icon}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{t(`cases.${u.key}.title`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`cases.${u.key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
