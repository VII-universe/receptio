'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { normalizeTestPhone } from '@/lib/phone'

const STORAGE_KEY = 'receptio_test_phone'

// localStorage nemusí být dostupné (soukromý režim, zablokovaná data) – vždy v try/catch
const readSaved = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function TestCallDialog({
  agentId,
  agentName,
  hasPhoneNumber,
  hasUnsavedChanges,
}: {
  agentId: string
  agentName: string
  hasPhoneNumber: boolean
  hasUnsavedChanges: boolean
}) {
  const t = useTranslations('agents')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [remember, setRemember] = useState(true)
  const [calling, setCalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Předvyplnění číslem z minulého testu při otevření dialogu
  useEffect(() => {
    if (open) {
      setPhone(readSaved())
      setError(null)
    }
  }, [open])

  async function call() {
    const check = normalizeTestPhone(phone)
    if (!check.ok) {
      setError(check.error)
      return
    }
    setCalling(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/test-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: check.number }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('callStartFailed'))

      try {
        if (remember) window.localStorage.setItem(STORAGE_KEY, phone.trim())
        else window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* uložení čísla je jen pohodlí */
      }
      toast.add({ type: 'success', title: t('callStarted') })
      setOpen(false)
    } catch (e) {
      const message = e instanceof Error ? e.message : t('callStartFailed')
      setError(message)
      toast.add({ type: 'error', title: t('testFailed'), description: message })
    } finally {
      setCalling(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        📞 {t('testAgent')}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !calling && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('testCallTitle')}</DialogTitle>
            <DialogDescription>
              {t('testCallDesc', { name: agentName })}
            </DialogDescription>
          </DialogHeader>

          {!hasPhoneNumber ? (
            <div className="flex flex-col items-start gap-3 text-sm">
              <p>{t('noPhoneAssigned')}</p>
              <Link href="/dashboard/phone-numbers" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                {tn('phoneNumbers')}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="testPhone">{t('yourPhone')}</Label>
                <Input
                  id="testPhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+420 777 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !calling && call()}
                  aria-invalid={!!error}
                  autoFocus
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  {t('rememberPhone')}
                </label>
              </div>
              {hasUnsavedChanges && (
                <p className="text-sm text-yellow-600">
                  {t('unsavedChanges')}
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={calling}>
              {tc('cancel')}
            </Button>
            {hasPhoneNumber && (
              <Button onClick={call} disabled={calling || !phone.trim()}>
                {calling && <Loader2 className="animate-spin" />}
                {calling ? t('dialing') : t('call')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
