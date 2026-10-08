import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { Link as IntlLink } from '@/i18n/navigation'
import { MarketingLocaleSwitcher } from '@/components/layout/marketing-locale-switcher'
import { cn } from '@/lib/utils'

export async function Navbar() {
  const t = await getTranslations('landing.nav')
  const locale = await getLocale()

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <IntlLink
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-white"
        >
          {/* Microphone icon */}
          <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/40">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <rect x="4" y="1" width="6" height="8" rx="3" fill="currentColor" />
              <path
                d="M2 7a5 5 0 0 0 10 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <line
                x1="7"
                y1="12"
                x2="7"
                y2="14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          Receptio
        </IntlLink>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a
            href={`/${locale}#jak-to-funguje`}
            className="text-zinc-400 transition-colors hover:text-white"
          >
            {t('howItWorks')}
          </a>
          <a
            href={`/${locale}#cenik`}
            className="text-zinc-400 transition-colors hover:text-white"
          >
            {t('pricing')}
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <MarketingLocaleSwitcher />
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'text-zinc-400 hover:bg-white/8 hover:text-white'
            )}
          >
            {t('signIn')}
          </Link>
          <Link
            href="/sign-up"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-indigo-600 text-white hover:bg-indigo-500'
            )}
          >
            {t('tryFree')}
          </Link>
        </div>
      </div>
    </header>
  )
}
