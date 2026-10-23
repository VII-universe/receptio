import { getTranslations } from 'next-intl/server'
import { SectionHeading } from './section-heading'
import { HoursMock, NotificationMock, NumberMock } from './ui-mocks'

const STEPS = [
  { key: 's1', Mock: HoursMock },
  { key: 's2', Mock: NumberMock },
  { key: 's3', Mock: NotificationMock },
] as const

export async function HowItWorks() {
  const t = await getTranslations('marketing.how')

  return (
    <section id="jak-to-funguje" data-tone="light" aria-labelledby="how-title" className="phase-morning mk-section scroll-mt-16">
      <div className="mk-container">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} titleId="how-title" />
        <ol className="mt-16 grid gap-14 md:mt-24 md:mx-auto md:max-w-xl lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:grid-rows-[auto_auto] lg:gap-x-12 lg:gap-y-8">
          {STEPS.map(({ key, Mock }, i) => (
            <li key={key} className="flex min-w-0 flex-col gap-8 lg:row-span-2 lg:grid lg:grid-cols-[minmax(0,1fr)] lg:grid-rows-subgrid">
              <div className="w-full self-end">
                <Mock />
              </div>
              <div className="flex flex-col gap-3 border-t border-line pt-6">
                <span className="mk-mono text-sm text-accent-text">0{i + 1}</span>
                <h3 className="mk-display mk-h3">{t(`steps.${key}.title`)}</h3>
                <p className="text-fg-soft">{t(`steps.${key}.text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
