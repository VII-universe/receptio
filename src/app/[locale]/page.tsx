import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { Navbar } from '@/components/layout/navbar'
import { MarketingFooter } from '@/components/layout/marketing-footer'
import { Pricing } from '@/components/landing/pricing'
import { RoiCalculator } from '@/components/landing/roi-calculator'
import { PhoneWave } from '@/components/landing/phone-wave'
import { cn } from '@/lib/utils'

const STEPS = ['step1', 'step2', 'step3'] as const
const USE_CASES = [
  { key: 'restaurant', icon: '🍽️', color: 'from-orange-500/10 to-orange-600/5' },
  { key: 'dental', icon: '🦷', color: 'from-blue-500/10 to-blue-600/5' },
  { key: 'auto', icon: '🔧', color: 'from-zinc-500/10 to-zinc-600/5' },
  { key: 'beauty', icon: '✂️', color: 'from-pink-500/10 to-pink-600/5' },
] as const

const STATS = [
  { value: '24/7', label: 'Dostupnost' },
  { value: '<1s', label: 'Doba odezvy' },
  { value: '98%', label: 'Spokojených zákazníků' },
  { value: '0 Kč', label: 'Zmeškaných hovorů' },
]

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('landing')

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
          </div>

          <div className="relative mx-auto max-w-5xl px-4 text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-300 backdrop-blur">
              <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-400" />
              AI recepční dostupný nonstop
            </div>

            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-7xl">
              Váš recepční{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                nikdy nespí
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
              {t('hero.subtitle')}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'bg-indigo-600 px-8 text-base font-semibold hover:bg-indigo-500'
                )}
              >
                {t('nav.tryFree')}
              </Link>
              <Link
                href={`/${locale}#jak-to-funguje`}
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'border-white/20 bg-white/5 text-base text-white backdrop-blur hover:bg-white/10 hover:text-white'
                )}
              >
                Jak to funguje →
              </Link>
            </div>

            <p className="mt-5 text-sm text-zinc-500">{t('hero.trial')} · {t('hero.suitable')}</p>

            {/* Animated phone wave */}
            <div className="mt-16 flex justify-center">
              <PhoneWave />
            </div>
          </div>
        </section>

        {/* ── Stats strip ── */}
        <section className="border-b bg-zinc-900">
          <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-zinc-800 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 px-6 py-8 text-center">
                <span className="text-3xl font-bold text-white sm:text-4xl">{s.value}</span>
                <span className="text-sm text-zinc-400">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Jak to funguje ── */}
        <section id="jak-to-funguje" className="scroll-mt-20 bg-zinc-950 py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">
              Proces
            </div>
            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t('how.title')}
            </h2>

            <ol className="mt-16 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  className="relative flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/3 p-8 backdrop-blur"
                >
                  {/* Step number */}
                  <span className="flex size-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-600/30">
                    {i + 1}
                  </span>
                  {/* Connector line (desktop only) */}
                  {i < 2 && (
                    <span
                      className="absolute -right-4 top-10 hidden h-px w-8 bg-gradient-to-r from-indigo-500/50 to-transparent md:block"
                      aria-hidden
                    />
                  )}
                  <h3 className="text-xl font-semibold text-white">{t(`how.${s}Title`)}</h3>
                  <p className="text-zinc-400">{t(`how.${s}Text`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Use cases ── */}
        <section className="bg-zinc-900 py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">
              Odvětví
            </div>
            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t('cases.title')}
            </h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {USE_CASES.map((u) => (
                <div
                  key={u.key}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br p-6 transition-transform duration-200 hover:-translate-y-1',
                    u.color
                  )}
                >
                  <div className="text-4xl" aria-hidden>
                    {u.icon}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{t(`cases.${u.key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t(`cases.${u.key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ROI kalkulačka ── */}
        <section id="kalkulacka" className="scroll-mt-20 bg-zinc-950 py-24">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">
              Kalkulačka
            </div>
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t('roi.title')}
            </h2>
            <RoiCalculator />
          </div>
        </section>

        {/* ── Ceník ── */}
        <section id="cenik" className="scroll-mt-20 bg-zinc-900 py-24">
          <Pricing />
        </section>

        {/* ── CTA banner ── */}
        <section className="relative overflow-hidden bg-indigo-600 py-20">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-3xl px-4 text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Začněte zdarma ještě dnes
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-indigo-100">
              14 dní zdarma, bez platební karty. Nastavení za 5 minut.
            </p>
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'mt-8 bg-white px-10 text-base font-semibold text-indigo-600 hover:bg-indigo-50'
              )}
            >
              Vyzkoušet zdarma →
            </Link>
          </div>
        </section>

      </main>
      <MarketingFooter />
    </div>
  )
}
