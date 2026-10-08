import Link from 'next/link'
import { MailCheck, PhoneIncoming, Scissors, Settings2, Stethoscope, UtensilsCrossed, Wrench } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { Navbar } from '@/components/layout/navbar'
import { MarketingFooter } from '@/components/layout/marketing-footer'
import { Pricing } from '@/components/landing/pricing'
import { RoiCalculator } from '@/components/landing/roi-calculator'
import { PhoneWave } from '@/components/landing/phone-wave'
import { CountUp, GlassCard, Reveal } from '@/components/landing/reveal'
import { ForceDark } from '@/components/theme/theme-provider'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'step1', Icon: Settings2 },
  { key: 'step2', Icon: PhoneIncoming },
  { key: 'step3', Icon: MailCheck },
] as const

const USE_CASES = [
  { key: 'restaurant', Icon: UtensilsCrossed, tile: 'from-orange-400/25 to-orange-600/10 text-orange-300 ring-orange-400/25', glow: 'bg-orange-500/20' },
  { key: 'dental', Icon: Stethoscope, tile: 'from-sky-400/25 to-blue-600/10 text-sky-300 ring-sky-400/25', glow: 'bg-sky-500/20' },
  { key: 'auto', Icon: Wrench, tile: 'from-zinc-300/20 to-zinc-500/10 text-zinc-200 ring-zinc-300/20', glow: 'bg-zinc-400/15' },
  { key: 'beauty', Icon: Scissors, tile: 'from-pink-400/25 to-fuchsia-600/10 text-pink-300 ring-pink-400/25', glow: 'bg-pink-500/20' },
] as const

const STATS = ['1', '2', '3', '4'] as const

/** Jemný oddělovač mezi sekcemi. */
const Divider = () => (
  <div className="bg-zinc-950" aria-hidden>
    <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
  </div>
)

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('landing')
  const accent = t('hero.titleAccent') // jazyky bez rozděleného nadpisu mají prázdný

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <ForceDark />
      <Navbar />
      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-zinc-950 pb-24 pt-20 text-white sm:pb-32 sm:pt-28">
          {/* Background gradient blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="rc-grid absolute inset-0" />
            <div className="rc-aurora absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-600/25 blur-[120px]" />
            <div className="rc-aurora absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[120px] [animation-delay:-6s] [animation-direction:alternate-reverse]" />
            <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[100px]" />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 text-center">
            {/* Badge */}
            <div className="rc-in glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-zinc-200">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-emerald-400" aria-hidden="true">
                <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('hero.badge')}
            </div>

            <h1 className="rc-in rc-heading text-balance text-5xl font-semibold leading-[1.04] tracking-[-0.04em] [--rc-delay:120ms] sm:text-7xl lg:text-8xl">
              {t('hero.title')}
              {accent && (
                <>
                  <br className="hidden sm:block" />{' '}
                  <span className="rc-display rc-shimmer bg-gradient-to-r from-indigo-300 via-violet-300 to-indigo-300 bg-clip-text pr-1 text-transparent">{accent}</span>
                </>
              )}
            </h1>

            <p className="rc-in mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-400 [--rc-delay:260ms] sm:text-xl">{t('hero.subtitle')}</p>

            <div className="rc-in mt-10 flex flex-col items-center justify-center gap-3 [--rc-delay:380ms] sm:flex-row">
              <Link href="/sign-up" className={cn(buttonVariants({ size: 'lg' }), 'rc-sheen relative h-14 overflow-hidden bg-indigo-600 px-10 text-base font-semibold shadow-lg shadow-indigo-600/40 hover:bg-indigo-500')}>
                {t('nav.tryFree')}
              </Link>
              <Link
                href={`/${locale}#jak-to-funguje`}
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'glass h-14 border-white/15 px-10 text-base text-white hover:bg-white/10 hover:text-white'
                )}
              >
                {t('hero.howCta')}
              </Link>
            </div>

            <div className="rc-in mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500 [--rc-delay:480ms]">
              <span>✓ {t('hero.perk1')}</span>
              <span>✓ {t('hero.perk2')}</span>
              <span>✓ {t('hero.perk3')}</span>
            </div>

            <p className="mt-5 text-sm text-zinc-500">
              {t('hero.trial')} · {t('hero.suitable')}
            </p>

            {/* Animated phone wave */}
            <div className="rc-in mt-16 flex justify-center [--rc-delay:600ms]">
              <div className="rc-float">
                <PhoneWave />
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ── Stats strip ── */}
        <section className="bg-zinc-950 px-4 py-14">
          <div className="glass mx-auto grid max-w-5xl grid-cols-2 gap-y-2 rounded-3xl py-2 md:grid-cols-4 md:divide-x md:divide-white/10">
            {STATS.map((n) => (
              <div key={n} className="flex flex-col items-center gap-1 px-6 py-8 text-center">
                <CountUp
                  value={t(`stats.v${n}`)}
                  className="bg-gradient-to-b from-white to-indigo-200 bg-clip-text text-4xl font-semibold tracking-[-0.04em] text-transparent sm:text-5xl"
                />
                <span className="text-sm text-zinc-400">{t(`stats.l${n}`)}</span>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* ── Jak to funguje ── */}
        <section id="jak-to-funguje" className="relative scroll-mt-20 bg-zinc-950 py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">{t('how.eyebrow')}</div>
            <Reveal>
              <h2 className="rc-heading mx-auto max-w-3xl text-center text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{t('how.title')}</h2>
            </Reveal>

            <ol className="mt-16 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.key} delay={i * 120} className="relative">
                <GlassCard className="flex h-full flex-col gap-4 p-8">
                  {/* Step number + icon */}
                  <div className="flex items-center justify-between">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-600/30">
                      {i + 1}
                    </span>
                    <span className="flex size-12 items-center justify-center rounded-xl bg-white/5 text-indigo-300 ring-1 ring-white/10" aria-hidden>
                      <s.Icon className="size-6" strokeWidth={1.6} />
                    </span>
                  </div>
                  {/* Connector line (desktop only) */}
                  {i < STEPS.length - 1 && (
                    <span
                      className="absolute -right-4 top-10 hidden h-[2px] w-8 animate-pulse bg-gradient-to-r from-indigo-500/50 to-transparent md:block"
                      aria-hidden
                    />
                  )}
                  <h3 className="text-xl font-semibold tracking-tight text-white">{t(`how.${s.key}Title`)}</h3>
                  <p className="text-zinc-400">{t(`how.${s.key}Text`)}</p>
                </GlassCard>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <Divider />

        {/* ── Use cases ── */}
        <section className="relative overflow-hidden bg-zinc-950 py-28">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[140px]" aria-hidden />
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">{t('cases.eyebrow')}</div>
            <Reveal>
              <h2 className="rc-heading mx-auto max-w-3xl text-center text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{t('cases.title')}</h2>
            </Reveal>
            <div className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {USE_CASES.map((u, i) => (
                <Reveal key={u.key} delay={i * 100}>
                <GlassCard className="p-7">
                  <div className={cn('pointer-events-none absolute -right-10 -top-10 size-40 rounded-full blur-3xl', u.glow)} aria-hidden />
                  <span
                    className={cn(
                      'relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110',
                      u.tile
                    )}
                    aria-hidden
                  >
                    <u.Icon className="size-7" strokeWidth={1.6} />
                  </span>
                  <h3 className="relative mt-6 text-lg font-semibold tracking-tight text-white">{t(`cases.${u.key}.title`)}</h3>
                  <p className="relative mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{t(`cases.${u.key}.text`)}</p>
                  <p className="relative mt-5 border-t border-white/10 pt-4 text-xs font-medium text-indigo-300">{t(`cases.${u.key}.proof`)}</p>
                </GlassCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ── ROI kalkulačka ── */}
        <section id="kalkulacka" className="scroll-mt-20 bg-zinc-950 py-28">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">{t('roi.eyebrow')}</div>
            <Reveal>
              <h2 className="rc-heading mx-auto mb-14 max-w-3xl text-center text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{t('roi.title')}</h2>
            </Reveal>
            <Reveal delay={100}>
              <RoiCalculator />
            </Reveal>
          </div>
        </section>

        <Divider />

        {/* ── Ceník ── */}
        <section id="cenik" className="relative scroll-mt-20 overflow-hidden bg-zinc-950 py-28">
          <div className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[140px]" aria-hidden />
          <Pricing />
        </section>

        <Divider />

        {/* ── CTA banner ── */}
        <section className="relative overflow-hidden bg-zinc-950 px-4 py-24">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/15 blur-[120px]" aria-hidden />
          <div className="glass relative mx-auto max-w-3xl rounded-3xl px-6 py-16 text-center text-white sm:px-12">
            <h2 className="text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{t('cta.title')}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">{t('cta.text')}</p>
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'mt-10 h-14 bg-indigo-600 px-12 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500'
              )}
            >
              {t('cta.button')}
            </Link>
            <p className="mt-4 text-sm text-zinc-500">{t('cta.trust')}</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
