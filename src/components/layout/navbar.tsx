import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { Link as IntlLink } from '@/i18n/navigation'
import { MarketingLocaleSwitcher } from '@/components/layout/marketing-locale-switcher'

export async function Navbar() {
  const t = await getTranslations('landing.nav')
  const locale = await getLocale()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <IntlLink href="/" className="text-lg font-semibold tracking-tight">
          Receptio
        </IntlLink>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href={`/${locale}#jak-to-funguje`} className="hover:text-foreground">
            {t('howItWorks')}
          </a>
          <IntlLink href="/cennik" className="hover:text-foreground">
            {t('pricing')}
          </IntlLink>
        </nav>
        <div className="flex items-center gap-2">
          <MarketingLocaleSwitcher />
          <Link href="/sign-in" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            {t('signIn')}
          </Link>
          <Link href="/sign-up" className={buttonVariants({ size: 'sm' })}>
            {t('tryFree')}
          </Link>
        </div>
      </div>
    </header>
  )
}
