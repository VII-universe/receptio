'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { TIMEZONES } from '@/lib/agents/working-hours'
import { BUSINESS_TYPES } from '@/lib/onboarding'
import { cn } from '@/lib/utils'

export interface GeneralValues {
  businessName: string
  businessType: string | null
  timezone: string
}

export function GeneralSettings({ initial }: { initial: GeneralValues }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (values.businessName.trim().length < 2) {
      setError('Název firmy musí mít alespoň 2 znaky.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/workspaces/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: values.businessName.trim(),
          ...(values.businessType ? { business_type: values.businessType } : {}),
          timezone: values.timezone,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Uložení se nepodařilo.')
      toast.add({ type: 'success', title: 'Nastavení bylo uloženo' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení se nepodařilo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={save} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Firma</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="businessName">Název firmy</Label>
              <Input
                id="businessName"
                value={values.businessName}
                maxLength={100}
                onChange={(e) => setValues((v) => ({ ...v, businessName: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Typ firmy</Label>
              <Select
                value={values.businessType}
                items={BUSINESS_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                onValueChange={(v) => v && setValues((x) => ({ ...x, businessType: v }))}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Vyberte typ firmy" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Časová zóna</Label>
              <Select
                value={values.timezone}
                items={TIMEZONES.map((t) => ({ value: t, label: t }))}
                onValueChange={(v) => v && setValues((x) => ({ ...x, timezone: v }))}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Výchozí časová zóna pro nové agenty.</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="self-start" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Uložit změny
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card className="border-destructive/60">
        <CardHeader>
          <button
            type="button"
            onClick={() => setDangerOpen((o) => !o)}
            aria-expanded={dangerOpen}
            className="flex w-full items-center justify-between text-left"
          >
            <CardTitle className="text-destructive">Nebezpečná zóna</CardTitle>
            <ChevronDown className={cn('size-4 text-destructive transition-transform', dangerOpen && 'rotate-180')} />
          </button>
        </CardHeader>
        {dangerOpen && (
          <CardContent className="flex flex-col items-start gap-3">
            <CardDescription>Smazání workspace odstraní všechny agenty, čísla a historii hovorů.</CardDescription>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              Smazat workspace
            </Button>
          </CardContent>
        )}
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat workspace?</DialogTitle>
            <DialogDescription>
              Přijdete o všechny agenty, telefonní čísla a historii hovorů. Akci nelze vrátit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false)
                toast.add({ type: 'info', title: 'Funkce bude brzy dostupná' })
              }}
            >
              Smazat workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
