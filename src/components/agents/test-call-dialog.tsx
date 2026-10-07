'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
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
      if (!res.ok) throw new Error(data.error ?? 'Hovor se nepodařilo zahájit.')

      try {
        if (remember) window.localStorage.setItem(STORAGE_KEY, phone.trim())
        else window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* uložení čísla je jen pohodlí */
      }
      toast.add({ type: 'success', title: 'Hovor iniciován – vyčkejte na příchozí hovor' })
      setOpen(false)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Hovor se nepodařilo zahájit.'
      setError(message)
      toast.add({ type: 'error', title: 'Testovací hovor se nezdařil', description: message })
    } finally {
      setCalling(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        📞 Otestovat agenta
      </Button>

      <Dialog open={open} onOpenChange={(o) => !calling && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Testovací hovor</DialogTitle>
            <DialogDescription>
              Zadejte číslo, na které vám zavoláme. Hovor proběhne s vaším agentem {agentName} a bude zaznamenán v
              historii hovorů.
            </DialogDescription>
          </DialogHeader>

          {!hasPhoneNumber ? (
            <div className="flex flex-col items-start gap-3 text-sm">
              <p>Nemáte přiřazené telefonní číslo. Přidejte číslo v sekci Telefonní čísla.</p>
              <Link href="/dashboard/telefon" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Telefonní čísla
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="testPhone">Vaše telefonní číslo</Label>
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
                  Zapamatovat číslo pro příští test
                </label>
              </div>
              {hasUnsavedChanges && (
                <p className="text-sm text-yellow-600">
                  Máte neuložené změny. Test použije naposledy uloženou verzi agenta.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={calling}>
              Zrušit
            </Button>
            {hasPhoneNumber && (
              <Button onClick={call} disabled={calling || !phone.trim()}>
                {calling && <Loader2 className="animate-spin" />}
                {calling ? 'Vytáčím…' : 'Zavolat'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
