import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function MarketingFooter() {
  const t = await getTranslations('landing')
  return (
    <footer className="border-t border-white/8 bg-zinc-950 text-zinc-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between">
        {/* Brand */}
        <div className="flex flex-col gap-2">
          <p className="text-base font-bold text-white">Receptio</p>
          <p className="max-w-xs text-sm leading-relaxed">{t('footer.tagline')}</p>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/sign-in" className="hover:text-white transition-colors">
            {t('nav.signIn')}
          </Link>
          <Link href="/sign-up" className="hover:text-white transition-colors">
            {t('nav.tryFree')}
          </Link>
          <Link href="/api-docs" className="hover:text-white transition-colors">
            {t('footer.apiDocs')}
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            {t('footer.privacy')}
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/8 py-5 text-center text-xs text-zinc-600">
        {t('footer.rights')}
      </div>
    </footer>
  )
}
