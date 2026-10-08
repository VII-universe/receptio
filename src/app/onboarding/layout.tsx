import Link from 'next/link'
import { NextIntlClientProvider } from 'next-intl'
import { CookieBanner } from '@/components/consent/cookie-banner'
import { HtmlLang } from '@/components/html-lang'
import { loadMessages } from '@/i18n/messages'
import { getWorkspaceLocale } from '@/lib/locale/get-workspace-locale'

// Onboarding je mimo dashboard i marketing, jazyk bere z workspace / cookie `locale` (jinak výchozí).
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getWorkspaceLocale()
  const messages = await loadMessages(locale)

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLang locale={locale} />
      <div className="min-h-screen bg-background">
        <header className="px-6 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Receptio
          </Link>
        </header>
        {children}
      </div>
      <CookieBanner />
    </NextIntlClientProvider>
  )
}
