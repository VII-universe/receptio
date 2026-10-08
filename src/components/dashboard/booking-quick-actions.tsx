'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

/** Rychlé potvrzení / zamítnutí čekající rezervace přímo z přehledu. */
export function BookingQuickActions({ bookingId }: { bookingId: string }) {
  const t = useTranslations('dashboard.bookings')
  const router = useRouter()
  const [busy, setBusy] = useState<'confirmed' | 'cancelled' | null>(null)

  async function set(status: 'confirmed' | 'cancelled') {
    setBusy(status)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!res.ok) throw new Error()
      toast.add({ type: 'success', title: status === 'confirmed' ? t('confirmed') : t('declined') })
      router.refresh()
    } catch {
      toast.add({ type: 'error', title: t('failed') })
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" disabled={busy !== null} onClick={() => set('confirmed')}>
        {busy === 'confirmed' ? <Loader2 className="animate-spin" /> : <Check />} {t('confirm')}
      </Button>
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => set('cancelled')} aria-label={t('decline')}>
        {busy === 'cancelled' ? <Loader2 className="animate-spin" /> : <X />}
        <span className="hidden sm:inline">{t('decline')}</span>
      </Button>
    </div>
  )
}
