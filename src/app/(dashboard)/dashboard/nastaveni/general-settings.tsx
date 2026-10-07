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
  currency: 'CZK' | 'EUR'
}

export function GeneralSettings({ initial, currencyLocked }: { initial: GeneralValues; currencyLocked: boolean }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (values.businessName.trim().length < 2) {
      setError('The business name must be at least 2 characters.')
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
          ...(currencyLocked ? {} : { currency: values.currency }),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Saving failed.')
      toast.add({ type: 'success', title: 'Settings saved' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saving failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={save} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Business</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                value={values.businessName}
                maxLength={100}
                onChange={(e) => setValues((v) => ({ ...v, businessName: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Business type</Label>
              <Select
                value={values.businessType}
                items={BUSINESS_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                onValueChange={(v) => v && setValues((x) => ({ ...x, businessType: v }))}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Select a business type" />
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
              <Label>Time zone</Label>
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
              <p className="text-sm text-muted-foreground">Default time zone for new agents.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Billing currency</Label>
              <Select
                value={values.currency}
                items={[{ value: 'CZK', label: 'CZK – Czech koruna' }, { value: 'EUR', label: 'EUR – Euro' }]}
                onValueChange={(v) => v && setValues((x) => ({ ...x, currency: v as 'CZK' | 'EUR' }))}
              >
                <SelectTrigger className="w-full sm:w-72" disabled={currencyLocked}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CZK">CZK – Czech koruna</SelectItem>
                  <SelectItem value="EUR">EUR – Euro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {currencyLocked
                  ? 'The currency can only be changed by cancelling and starting a new subscription.'
                  : 'You can change the currency until you have a subscription.'}
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="self-start" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Save changes
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
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <ChevronDown className={cn('size-4 text-destructive transition-transform', dangerOpen && 'rotate-180')} />
          </button>
        </CardHeader>
        {dangerOpen && (
          <CardContent className="flex flex-col items-start gap-3">
            <CardDescription>Deleting the workspace removes all agents, numbers and call history.</CardDescription>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              Delete workspace
            </Button>
          </CardContent>
        )}
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace?</DialogTitle>
            <DialogDescription>
              You will lose all agents, phone numbers and call history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false)
                toast.add({ type: 'info', title: 'This feature is coming soon' })
              }}
            >
              Delete workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
