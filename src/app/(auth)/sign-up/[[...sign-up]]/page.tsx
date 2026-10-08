import { SignUp } from '@clerk/nextjs'
import { getLocale, getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('legal')
  const locale = await getLocale()
  const link = 'underline underline-offset-4 hover:text-foreground'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <SignUp />
      {/* Informace o podmínkách a zásadách při registraci. */}
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        {t('signupPrefix')}{' '}
        <a href={`/${locale}/terms`} className={link}>
          {t('terms')}
        </a>{' '}
        {t('signupAnd')}{' '}
        <a href={`/${locale}/privacy`} className={link}>
          {t('privacy')}
        </a>
        {t('signupPost')}
      </p>
    </div>
  )
}
