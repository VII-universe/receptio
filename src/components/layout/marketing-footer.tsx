import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { CookieSettingsButton } from '@/components/consent/cookie-settings-button'
import { LogoMark } from '@/components/layout/logo-mark'
import { Link as IntlLink } from '@/i18n/navigation'

export async function MarketingFooter() {
  const t = await getTranslations('landing')
  const tl = await getTranslations('legal')
  const locale = await getLocale()
  const link = 'transition-colors hover:text-white'

  return (
    <footer className="bg-zinc-950 text-zinc-400">
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-base font-bold text-white">
            <LogoMark className="size-6" />
            Receptio
          </p>
          <p className="max-w-xs text-sm leading-relaxed">{t('footer.tagline')}</p>
        </div>

        <nav aria-label={t('footer.groupProduct')} className="flex flex-col gap-2 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">{t('footer.groupProduct')}</p>
          <a href={`/${locale}#jak-to-funguje`} className={link}>
            {t('nav.howItWorks')}
          </a>
          <a href={`/${locale}#cenik`} className={link}>
            {t('nav.pricing')}
          </a>
          <Link href="/api-docs" className={link}>
            {t('footer.apiDocs')}
          </Link>
        </nav>

        <nav aria-label={t('footer.groupLegal')} className="flex flex-col gap-2 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">{t('footer.groupLegal')}</p>
          <IntlLink href="/privacy" className={link}>
            {t('footer.privacy')}
          </IntlLink>
          <IntlLink href="/terms" className={link}>
            {t('footer.terms')}
          </IntlLink>
          <IntlLink href="/cookies" className={link}>
            {tl('cookies')}
          </IntlLink>
          <CookieSettingsButton className={`${link} text-left`}>{tl('cookieSettings')}</CookieSettingsButton>
        </nav>
      </div>

      <div className="border-t border-white/8 py-5 text-center text-xs text-zinc-600">{t('footer.rights')}</div>
    </footer>
  )
}
