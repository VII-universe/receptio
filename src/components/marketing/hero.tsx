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
    // Hero leží nad ranním 3D městem (city-backdrop.tsx): bez vlastního pozadí, text drží kontrast měkký podklad.
    <section data-tone="light" aria-labelledby="hero-title" className="tone-light relative pt-[4.5rem]">

      <div className="mk-container relative grid items-center gap-x-10 gap-y-14 pb-20 pt-12 md:pb-28 md:pt-20 lg:grid-cols-12">
        <div className="mk-hero-copy mk-halo relative flex min-w-0 flex-col gap-8 lg:col-span-7">
          <p className="mk-eyebrow mk-rise">{t('eyebrow')}</p>
          <h1 id="hero-title" className="mk-display mk-h1 mk-rise-soft">
            {t.rich('title', { em: (chunks) => <em>{chunks}</em> })}
          </h1>
          <p className="mk-lead mk-rise-soft max-w-[38ch] [animation-delay:120ms]">{t('subtitle')}</p>
          <div className="mk-rise flex flex-col gap-3 [animation-delay:220ms] sm:flex-row sm:items-center">
            <Magnetic>
              <Link href="/sign-up" className="mk-btn mk-btn-primary">
                {tc('tryFree')}
              </Link>
            </Magnetic>
            <ListenButton className="bg-day/75" />
          </div>
          <ul className="mk-rise flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem] text-fg [animation-delay:320ms]">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <IconCheck size={18} className="text-accent-text" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="mk-halo relative min-w-0 lg:col-span-5">
          <HeroDemo />
        </div>
      </div>
    </section>
  )
}
