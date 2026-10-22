import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { OrbStatic } from './orb-static'

/** Závěr: noční scéna s tiše svítícím orbem. */
export async function FinalCta() {
  const t = await getTranslations('marketing.finalCta')
  const tc = await getTranslations('marketing.common')

  return (
    <section data-tone="dark" aria-labelledby="final-title" className="phase-night relative overflow-hidden">
      {/* Orb tiše svítí pod textem jako měsíc nad obzorem; text drží kontrast díky ztlumení. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[62%] w-[min(52rem,130vw)] -translate-x-1/2 -translate-y-1/2 opacity-35 blur-[2px]">
        <OrbStatic />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-night to-transparent" />
      <div className="mk-container relative flex min-h-[80svh] flex-col items-center justify-center gap-8 py-28 text-center">
        <h2 id="final-title" className="mk-display mk-h1 max-w-[14ch]">
          {t('title')}
        </h2>
        <p className="mk-lead max-w-[40ch] text-moon">{t('text')}</p>
        <Link href="/sign-up" className="mk-btn mk-btn-primary">
          {tc('tryFree')}
        </Link>
        <p className="mk-mono text-sm uppercase tracking-[0.08em] text-fg-soft">{t('trust')}</p>
      </div>
    </section>
  )
}
