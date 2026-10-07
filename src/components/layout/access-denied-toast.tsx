'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from '@/components/ui/toast'

/** Po přesměrování z omezené stránky (?denied=1) ukáže upozornění a parametr odstraní z URL. */
export function AccessDeniedToast() {
  const t = useTranslations('errors')
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('denied') !== '1') return
    toast.add({ type: 'error', title: t('noPermission') })
    url.searchParams.delete('denied')
    window.history.replaceState(null, '', url)
  }, [t])
  return null
}
