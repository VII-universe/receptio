import { getTranslations } from 'next-intl/server'
import { DEMO_INDUSTRIES } from '@/lib/marketing/demo'
import { IconCheck } from './icons'
import { INDUSTRY_META } from './industry'
import { IndustryLive } from './industry-live'
import { IndustryPlayButton } from './listen-button'
import { SectionHeading } from './section-heading'

export async function Industries() {
  const t = await getTranslations('marketing.industries')

  return (
    <section id="ukazka" data-tone="light" aria-labelledby="industries-title" className="phase-noon mk-section scroll-mt-16">
      <div className="mk-container">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} titleId="industries-title" />
        <ul className="mt-16 grid gap-5 md:mt-20 md:grid-cols-2">
          {DEMO_INDUSTRIES.map((id) => {
            const { Icon, tint } = INDUSTRY_META[id]
            const handles = t.raw(`items.${id}.handles`) as string[]
            return (
              <li key={id} className="mk-card flex flex-col gap-6 p-7 md:p-9">
                <div className="flex items-center justify-between gap-4">
                  <span aria-hidden className="flex size-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tint}2e`, color: tint }}>
                    <Icon size={28} />
                  </span>
                  <IndustryPlayButton industry={id} label={t('play')} />
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="mk-display mk-h3">{t(`items.${id}.title`)}</h3>
                  <IndustryLive industry={id} scenario={t(`items.${id}.scenario`)} />
                </div>
                <div className="mt-auto border-t border-line pt-5">
                  <p className="mk-mono mb-3 text-xs uppercase tracking-[0.08em] text-fg-soft">{t('handles')}</p>
                  <ul className="flex flex-col gap-2 text-[0.9375rem]">
                    {handles.map((h) => (
                      <li key={h} className="flex items-start gap-2.5">
                        <IconCheck size={18} className="mt-0.5 shrink-0 text-accent-text" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
