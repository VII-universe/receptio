'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { LOCALE_META } from '@/i18n/locales'
import { isLocale, LOCALES } from '@/i18n/routing'

const items = LOCALES.map((l) => ({ value: l, label: `${LOCALE_META[l].flag} ${LOCALE_META[l].name}` }))

/** Přepínač jazyka dashboardu: uloží jazyk do workspace a obnoví stránku. */
export function LocaleSwitcher({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter()
  const t = useTranslations('settings')
  const current = useLocale()
  const [value, setValue] = useState(current)
  const [saving, setSaving] = useState(false)

  async function change(next: string | null) {
    if (!next || !isLocale(next) || next === value) return
    const previous = value
    setValue(next)
    setSaving(true)
    try {
      const res = await fetch('/api/workspace/locale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      })
      if (!res.ok) throw new Error()
      router.refresh() // nové překlady se načtou v layoutu dashboardu
    } catch {
      setValue(previous)
      toast.add({ type: 'error', title: t('languageSaveFailed') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Select value={value} items={items} onValueChange={change}>
      <SelectTrigger className="w-full sm:w-72" disabled={disabled || saving}>
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
