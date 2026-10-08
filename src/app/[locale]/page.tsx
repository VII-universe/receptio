import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { Navbar } from '@/components/layout/navbar'
import { MarketingFooter } from '@/components/layout/marketing-footer'
import { Pricing } from '@/components/landing/pricing'
import { RoiCalculator } from '@/components/landing/roi-calculator'
import { PhoneWave } from '@/components/landing/phone-wave'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'step1', icon: '⚙️' },
  { key: 'step2', icon: '📞' },
  { key: 'step3', icon: '✉️' },
] as const

const USE_CASES = [
  { key: 'restaurant', icon: '🍽️', color: 'from-orange-500/10 to-orange-600/5', hover: 'hover:from-orange-500/15 hover:to-orange-600/10' },
  { key: 'dental', icon: '🦷', color: 'from-blue-500/10 to-blue-600/5', hover: 'hover:from-blue-500/15 hover:to-blue-600/10' },
  { key: 'auto', icon: '🔧', color: 'from-zinc-500/10 to-zinc-600/5', hover: 'hover:from-zinc-500/15 hover:to-zinc-600/10' },
  { key: 'beauty', icon: '✂️', color: 'from-pink-500/10 to-pink-600/5', hover: 'hover:from-pink-500/15 hover:to-pink-600/10' },
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
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-zinc-950 pb-24 pt-20 text-white sm:pb-32 sm:pt-28">
          {/* Background gradient blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
            <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
            <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[100px]" />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-zinc-300 backdrop-blur">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-emerald-400" aria-hidden="true">
                <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('hero.badge')}
            </div>

            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-7xl sm:tracking-tighter">
              {t('hero.title')}
              {accent && (
                <>
                  <br className="hidden sm:block" />{' '}
                  <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{accent}</span>
                </>
              )}
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">{t('hero.subtitle')}</p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/sign-up" className={cn(buttonVariants({ size: 'lg' }), 'bg-indigo-600 px-8 text-base font-semibold hover:bg-indigo-500')}>
                {t('nav.tryFree')}
              </Link>
              <Link
                href={`/${locale}#jak-to-funguje`}
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'border-white/20 bg-white/5 text-base text-white backdrop-blur hover:bg-white/10 hover:text-white'
                )}
              >
                {t('hero.howCta')}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500">
              <span>✓ {t('hero.perk1')}</span>
              <span>✓ {t('hero.perk2')}</span>
              <span>✓ {t('hero.perk3')}</span>
            </div>

            <p className="mt-5 text-sm text-zinc-500">
              {t('hero.trial')} · {t('hero.suitable')}
            </p>

            {/* Animated phone wave */}
            <div className="mt-16 flex justify-center">
              <PhoneWave />
            </div>
          </div>
        </section>

        <Divider />

        {/* ── Stats strip ── */}
        <section className="border-y border-zinc-800 bg-zinc-900">
          <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-zinc-800 md:grid-cols-4">
            {STATS.map((n) => (
              <div key={n} className="flex flex-col items-center gap-1 px-6 py-8 text-center">
                <span className="bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-3xl font-black text-transparent sm:text-4xl">
                  {t(`stats.v${n}`)}
                </span>
                <span className="text-sm text-zinc-400">{t(`stats.l${n}`)}</span>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* ── Jak to funguje ── */}
        <section id="jak-to-funguje" className="scroll-mt-20 bg-zinc-950 py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">{t('how.eyebrow')}</div>
            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('how.title')}</h2>

            <ol className="mt-16 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li
                  key={s.key}
                  className="relative flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/3 p-8 backdrop-blur transition-colors duration-300 hover:border-indigo-500/30 hover:bg-white/5"
                >
                  {/* Step number + icon */}
                  <div className="flex items-center justify-between">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-600/30">
                      {i + 1}
                    </span>
                    <span className="text-2xl" aria-hidden>
                      {s.icon}
                    </span>
                  </div>
                  {/* Connector line (desktop only) */}
                  {i < STEPS.length - 1 && (
                    <span
                      className="absolute -right-4 top-10 hidden h-[2px] w-8 animate-pulse bg-gradient-to-r from-indigo-500/50 to-transparent md:block"
                      aria-hidden
                    />
                  )}
                  <h3 className="text-xl font-semibold text-white">{t(`how.${s.key}Title`)}</h3>
                  <p className="text-zinc-400">{t(`how.${s.key}Text`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <Divider />

        {/* ── Use cases ── */}
        <section className="bg-zinc-900 py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">{t('cases.eyebrow')}</div>
            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('cases.title')}</h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {USE_CASES.map((u) => (
                <div
                  key={u.key}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/15',
                    'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-indigo-500/50 before:to-transparent',
                    u.color,
                    u.hover
                  )}
                >
                  <span className="mb-2 block text-5xl transition-transform duration-300 group-hover:scale-110" aria-hidden>
                    {u.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{t(`cases.${u.key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t(`cases.${u.key}.text`)}</p>
                  <p className="mt-3 text-xs font-medium text-indigo-400">{t(`cases.${u.key}.proof`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ── ROI kalkulačka ── */}
        <section id="kalkulacka" className="scroll-mt-20 bg-zinc-950 py-24">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">{t('roi.eyebrow')}</div>
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('roi.title')}</h2>
            <RoiCalculator />
          </div>
        </section>

        <Divider />

        {/* ── Ceník ── */}
        <section id="cenik" className="scroll-mt-20 bg-zinc-900 py-24">
          <Pricing />
        </section>

        <Divider />

        {/* ── CTA banner ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 py-20">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-3xl px-4 text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('cta.title')}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-indigo-100">{t('cta.text')}</p>
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'mt-8 bg-white px-10 text-base font-semibold text-indigo-600 shadow-2xl shadow-white/20 hover:bg-indigo-50 hover:shadow-white/30'
              )}
            >
              {t('cta.button')}
            </Link>
            <p className="mt-4 text-sm text-indigo-200">{t('cta.trust')}</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
