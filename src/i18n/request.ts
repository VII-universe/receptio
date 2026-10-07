import { getRequestConfig } from 'next-intl/server'
import { getWorkspaceLocale } from '@/lib/locale/get-workspace-locale'
import { loadMessages } from './messages'
import { isLocale } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  // Marketing stránky mají locale v URL; dashboard a ostatní stránky bez locale v adrese
  // berou jazyk z nastavení workspace (viz getWorkspaceLocale).
  const fromUrl = await requestLocale
  const locale = isLocale(fromUrl) ? fromUrl : await getWorkspaceLocale()

  return { locale, messages: await loadMessages(locale) }
})
