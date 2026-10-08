'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LOCALE_META } from '@/i18n/locales'
import { usePathname, useRouter } from '@/i18n/navigation'
import { isLocale, LOCALES } from '@/i18n/routing'

const items = LOCALES.map((l) => ({ value: l, label: `${LOCALE_META[l].flag} ${LOCALE_META[l].name}` }))

/** Přepínač jazyka marketingových stránek: přejde na stejnou stránku v jiném jazyce (včetně lokalizované adresy). */
export function MarketingLocaleSwitcher() {
  const locale = useLocale()
  const t = useTranslations('landing.switcher')
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Select
      value={locale}
      items={items}
      onValueChange={(next) => {
        if (next && isLocale(next) && next !== locale) router.replace(pathname as '/', { locale: next })
      }}
    >
      <SelectTrigger size="sm" className="w-24 border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 sm:w-36" aria-label={t('label')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
