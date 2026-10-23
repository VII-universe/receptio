import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { CookieSettingsButton } from '@/components/consent/cookie-settings-button'
import { Link as IntlLink } from '@/i18n/navigation'
import { CONTACT_EMAIL } from '@/lib/marketing/flags'
import { LEGAL } from '@/lib/legal'
import { Logo } from './logo'

const isSet = (v: string) => v !== '[●]'

/** Patička veřejného webu. Provozovatel se čte z konfigurace (NEXT_PUBLIC_LEGAL_*), dokud chybí, řádek se nezobrazí. */
export async function SiteFooter() {
  const t = await getTranslations('marketing.footer')
  const tn = await getTranslations('marketing.nav')
  const locale = await getLocale()
  const link = 'rounded-md text-fg-soft transition-colors hover:text-fg'
  const head = 'mk-mono mb-4 text-xs font-medium uppercase tracking-[0.08em] text-fg-soft'
  const hasOperator = isSet(LEGAL.name) && isSet(LEGAL.companyId)

  return (
    <footer data-tone="dark" className="phase-night border-t border-line">
      <div className="mk-container grid gap-12 py-16 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:py-20">
        <div className="flex max-w-sm flex-col gap-4">
          <Logo />
          <p className="text-base leading-relaxed text-fg-soft">{t('tagline')}</p>
        </div>

        <nav aria-label={t('product')} className="text-[0.9375rem]">
          <p className={head}>{t('product')}</p>
          <ul className="flex flex-col gap-3">
            <li>
              <a href={`/${locale}#jak-to-funguje`} className={link}>
                {tn('how')}
              </a>
            </li>
            <li>
              <a href={`/${locale}#ukazka`} className={link}>
                {tn('demo')}
              </a>
            </li>
            <li>
              <IntlLink href="/cennik" className={link}>
                {tn('pricing')}
              </IntlLink>
            </li>
            <li>
              <Link href="/api-docs" className={link}>
                {t('apiDocs')}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={t('legal')} className="text-[0.9375rem]">
          <p className={head}>{t('legal')}</p>
          <ul className="flex flex-col gap-3">
            <li>
              <IntlLink href="/privacy" className={link}>
                {t('privacy')}
              </IntlLink>
            </li>
            <li>
              <IntlLink href="/terms" className={link}>
                {t('terms')}
              </IntlLink>
            </li>
            <li>
              <IntlLink href="/cookies" className={link}>
                {t('cookies')}
              </IntlLink>
            </li>
            <li>
              <CookieSettingsButton className={`${link} text-left`}>{t('cookieSettings')}</CookieSettingsButton>
            </li>
          </ul>
        </nav>

        <div className="text-[0.9375rem]">
          <p className={head}>{t('contact')}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      <div className="mk-container flex flex-col gap-2 border-t border-line py-6 text-sm text-fg-soft sm:flex-row sm:justify-between">
        <p>{t('rights', { year: new Date().getFullYear(), name: hasOperator ? LEGAL.name : 'Receptio' })}</p>
        {hasOperator && <p>{t('operator', { name: LEGAL.name, id: LEGAL.companyId })}</p>}
      </div>
    </footer>
  )
}
