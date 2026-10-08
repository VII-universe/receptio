import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { Link as IntlLink } from '@/i18n/navigation'
import { LogoMark } from '@/components/layout/logo-mark'
import { MarketingLocaleSwitcher } from '@/components/layout/marketing-locale-switcher'
import { NavbarProgress } from '@/components/layout/navbar-progress'
import { cn } from '@/lib/utils'

export async function Navbar() {
  const t = await getTranslations('landing.nav')
  const locale = await getLocale()

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <IntlLink href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <LogoMark />
          <span className="bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">Receptio</span>
        </IntlLink>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href={`/${locale}#jak-to-funguje`} className="text-zinc-400 transition-colors hover:text-white">
            {t('howItWorks')}
          </a>
          <a href={`/${locale}#cenik`} className="text-zinc-400 transition-colors hover:text-white">
            {t('pricing')}
          </a>
          <a href={`/${locale}#kalkulacka`} className="text-zinc-400 transition-colors hover:text-white">
            {t('calculator')}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <MarketingLocaleSwitcher />
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden text-zinc-400 hover:bg-white/8 hover:text-white sm:inline-flex')}
          >
            {t('signIn')}
          </Link>
          <Link href="/sign-up" className={cn(buttonVariants({ size: 'sm' }), 'h-9 bg-indigo-600 px-4 text-white hover:bg-indigo-500')}>
            {t('tryFree')}
          </Link>
        </div>
      </div>
      <NavbarProgress />
    </header>
  )
}
