import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { HeroDemo } from './hero-demo'
import { IconCheck } from './icons'
import { ListenButton } from './listen-button'
import { Magnetic } from './magnetic'

export async function Hero() {
  const t = await getTranslations('marketing.hero')
  const tc = await getTranslations('marketing.common')
  const perks = t.raw('perks') as string[]

  return (
    <section data-tone="light" aria-labelledby="hero-title" className="phase-morning relative overflow-hidden pt-[4.5rem]">
      {/* Ranní světlo: teplý přechod z rohu (ukotvený k obrazovce, ne k výšce sekce, která se mění s písmem) */}
      <div aria-hidden className="pointer-events-none absolute -right-[20%] -top-[36svh] h-[80vmax] w-[80vmax] rounded-full bg-[radial-gradient(circle,rgb(255_200_150/0.55),transparent_62%)]" />

      <div className="mk-container relative grid items-center gap-x-10 gap-y-14 pb-20 pt-12 md:pb-28 md:pt-20 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-7">
          <p className="mk-eyebrow">{t('eyebrow')}</p>
          <h1 id="hero-title" className="mk-display mk-h1">
            {t.rich('title', { em: (chunks) => <em>{chunks}</em> })}
          </h1>
          <p className="mk-lead max-w-[38ch]">{t('subtitle')}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Magnetic>
              <Link href="/sign-up" className="mk-btn mk-btn-primary">
                {tc('tryFree')}
              </Link>
            </Magnetic>
            <ListenButton />
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem] text-fg-soft">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <IconCheck size={18} className="text-accent-text" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <HeroDemo />
        </div>
      </div>
    </section>
  )
}
