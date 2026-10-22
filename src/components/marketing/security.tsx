import { getTranslations } from 'next-intl/server'
import { Link as IntlLink } from '@/i18n/navigation'
import { IconArrowRight, IconDatabase, IconLock, IconSliders, IconWaves } from './icons'
import { SectionHeading } from './section-heading'

const ITEMS = [
  { key: 'db', Icon: IconDatabase },
  { key: 'partners', Icon: IconWaves },
  { key: 'tls', Icon: IconLock },
  { key: 'control', Icon: IconSliders },
] as const

export async function Security() {
  const t = await getTranslations('marketing.security')

  return (
    <section data-tone="dark" aria-labelledby="security-title" className="phase-night mk-section">
      <div className="mk-container grid gap-14 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-8">
          <SectionHeading eyebrow={t('eyebrow')} title={t('title')} titleId="security-title" />
          <IntlLink href="/privacy" className="inline-flex items-center gap-2 self-start font-medium text-accent-text underline-offset-4 hover:underline">
            {t('privacyLink')}
            <IconArrowRight size={18} />
          </IntlLink>
        </div>
        <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {ITEMS.map(({ key, Icon }) => (
            <li key={key} className="flex flex-col gap-4 border-t border-line pt-6">
              <Icon size={28} className="text-accent-text" />
              <h3 className="text-xl font-semibold tracking-[-0.01em]">{t(`items.${key}.title`)}</h3>
              <p className="text-fg-soft">{t(`items.${key}.text`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
