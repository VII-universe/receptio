import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { buildCity } from '@/lib/marketing/city'
import { FinalOrb } from './final-orb'

/** Závěr: noční město, nad ním tiše svítí orb Aidy a v jediném okně se svítí. */
export async function FinalCta() {
  const t = await getTranslations('marketing.finalCta')
  const tc = await getTranslations('marketing.common')
  const city = buildCity()
  const aida = city.windows.find((w) => w.aida)

  return (
    <section data-tone="dark" aria-labelledby="final-title" className="phase-night relative overflow-hidden">
      {/* Noční město: všechno zhasnuto, svítí jen Aidino okno */}
      <svg aria-hidden viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" overflow="visible" className="pointer-events-none absolute inset-x-0 bottom-0 h-[22svh] w-full overflow-visible md:h-[28svh]">
        <defs>
          <radialGradient id="final-aida-glow">
            <stop offset="0" stopColor="#ff9a5a" stopOpacity="0.8" />
            <stop offset="0.4" stopColor="#ff8a4c" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ff8a4c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="fill-[#070b1f]">
          {city.buildings.map((b, i) => (
            <rect key={i} x={b.x} y={260 - b.h} width={b.w} height={b.h} />
          ))}
        </g>
        <g className="fill-[#111938]">
          {city.windows
            .filter((w) => !w.aida)
            .map((w, i) => (
              <rect key={i} x={w.x} y={w.y} width={10} height={14} rx={1.5} />
            ))}
        </g>
        {aida && (
          <>
            <circle cx={aida.x + 6} cy={aida.y + 8} r={150} fill="url(#final-aida-glow)" />
            <rect x={aida.x - 1} y={aida.y - 2} width={13} height={18} rx={1.5} className="story-win-aida" data-on="true" fill="#ffb070" />
          </>
        )}
      </svg>

      <div className="mk-container relative flex min-h-[92svh] flex-col items-center justify-center gap-7 pb-[26svh] pt-16 text-center md:pb-[32svh] md:pt-20">
        {/* orb v toku nad nadpisem (průhledný okraj plátna se schová pod záporný okraj, text ho nepřekryje) */}
        <FinalOrb className="pointer-events-none -mb-[4.5rem] w-[min(20rem,62vw)] md:-mb-[5rem]" />
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
