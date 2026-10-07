'use client'

import { NextIntlClientProvider } from 'next-intl'
import { HtmlLang } from '@/components/html-lang'

export function DashboardI18nProvider({
  locale,
  messages,
  children,
}: {
  locale: string
  messages: Record<string, unknown>
  children: React.ReactNode
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLang locale={locale} />
      {children}
    </NextIntlClientProvider>
  )
}
