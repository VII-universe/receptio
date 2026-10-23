import { getLocale, getTranslations } from 'next-intl/server'
import { MARKETING_PLANS, OVERAGE, defaultCurrency, formatMoney } from '@/lib/marketing/plans'
import { IconPlus } from './icons'
import { SectionHeading } from './section-heading'

const ITEMS = ['ai', 'unknown', 'number', 'setup', 'overage', 'data', 'cancel'] as const

/** Časté otázky jako nativní <details>: fungují z klávesnice i bez JavaScriptu. */
export async function Faq() {
  const t = await getTranslations('marketing.faq')
  const locale = await getLocale()
  const currency = defaultCurrency(locale)
  const minutes = Object.fromEntries(MARKETING_PLANS.map((p) => [p.id, p.minutes]))
  const values = { price: formatMoney(OVERAGE[currency], currency, locale), ...minutes }

  return (
    <section id="faq" data-tone="dark" aria-labelledby="faq-title" className="phase-night mk-section scroll-mt-16 pt-0 md:pt-0">
      <div className="mk-container">
        <div className="grid gap-12 border-t border-line pt-20 md:pt-28 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow={t('eyebrow')} title={t('title')} titleId="faq-title" className="lg:sticky lg:top-28 lg:self-start" />
          <div className="border-t border-line">
            {ITEMS.map((k) => (
              <details key={k} className="mk-faq border-b border-line">
                <summary className="flex min-h-20 items-center justify-between gap-6 py-5 text-[clamp(1.125rem,1.6vw,1.375rem)] font-medium leading-snug">
                  {t(`items.${k}.q`)}
                  <IconPlus className="mk-faq-icon shrink-0 text-accent-text" />
                </summary>
                <p className="max-w-[62ch] pb-7 text-fg-soft">{t(`items.${k}.a`, values)}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
