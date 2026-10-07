import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function MarketingFooter() {
  const t = await getTranslations('landing')
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-semibold">Receptio</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('footer.tagline')}</p>
        </div>
        <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link href="/sign-in" className="hover:text-foreground">
            {t('nav.signIn')}
          </Link>
          <Link href="/sign-up" className="hover:text-foreground">
            {t('nav.tryFree')}
          </Link>
          <Link href="/api-docs" className="hover:text-foreground">
            {t('footer.apiDocs')}
          </Link>
          <Link href="#" className="hover:text-foreground">
            {t('footer.privacy')}
          </Link>
        </nav>
      </div>
      <p className="border-t py-4 text-center text-xs text-muted-foreground">{t('footer.rights')}</p>
    </footer>
  )
}
