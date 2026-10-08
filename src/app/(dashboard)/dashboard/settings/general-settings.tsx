'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LocaleSwitcher } from '@/components/locale-switcher'
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
import { AppearanceCard } from '@/components/theme/appearance'
import { cn } from '@/lib/utils'

export interface GeneralValues {
  businessName: string
  businessType: string | null
  timezone: string
  currency: 'CZK' | 'EUR'
}

export function GeneralSettings({ initial, currencyLocked }: { initial: GeneralValues; currencyLocked: boolean }) {
  const router = useRouter()
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const tb = useTranslations('onboarding.businessTypes')
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (values.businessName.trim().length < 2) {
      setError(t('nameTooShort'))
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
      if (!res.ok) throw new Error(data.error ?? t('saveFailed'))
      toast.add({ type: 'success', title: t('saved') })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={save} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>{t('business')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="businessName">{t('businessName')}</Label>
              <Input
                id="businessName"
                value={values.businessName}
                maxLength={100}
                onChange={(e) => setValues((v) => ({ ...v, businessName: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('businessType')}</Label>
              <Select
                value={values.businessType}
                items={BUSINESS_TYPES.map((b) => ({ value: b.id, label: tb(b.id) }))}
                onValueChange={(v) => v && setValues((x) => ({ ...x, businessType: v }))}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder={t('selectBusinessType')} />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {tb(b.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('timeZone')}</Label>
              <Select
                value={values.timezone}
                items={TIMEZONES.map((z) => ({ value: z, label: z }))}
                onValueChange={(v) => v && setValues((x) => ({ ...x, timezone: v }))}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{t('timeZoneHint')}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('billingCurrency')}</Label>
              <Select
                value={values.currency}
                items={[{ value: 'CZK', label: t('currencyCzk') }, { value: 'EUR', label: t('currencyEur') }]}
                onValueChange={(v) => v && setValues((x) => ({ ...x, currency: v as 'CZK' | 'EUR' }))}
              >
                <SelectTrigger className="w-full sm:w-72" disabled={currencyLocked}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CZK">{t('currencyCzk')}</SelectItem>
                  <SelectItem value="EUR">{t('currencyEur')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {currencyLocked
                  ? t('currencyLockedHint')
                  : t('currencyChangeHint')}
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="self-start" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {tc('saveChanges')}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{t('appLanguage')}</CardTitle>
          <CardDescription>{t('appLanguageHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LocaleSwitcher />
        </CardContent>
      </Card>

      <AppearanceCard />

      <Card className="border border-destructive/30 bg-destructive/5">
        <CardHeader>
          <button
            type="button"
            onClick={() => setDangerOpen((o) => !o)}
            aria-expanded={dangerOpen}
            className="flex w-full items-center justify-between text-left"
          >
            <CardTitle className="text-destructive">{t('dangerZone')}</CardTitle>
            <ChevronDown className={cn('size-4 text-destructive transition-transform', dangerOpen && 'rotate-180')} />
          </button>
        </CardHeader>
        {dangerOpen && (
          <CardContent className="flex flex-col items-start gap-3">
            <CardDescription>{t('deleteWorkspaceDesc')}</CardDescription>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              {t('deleteWorkspace')}
            </Button>
          </CardContent>
        )}
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteWorkspaceQ')}</DialogTitle>
            <DialogDescription>
              {t('deleteWorkspaceWarn')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false)
                toast.add({ type: 'info', title: t('comingSoon') })
              }}
            >
              {t('deleteWorkspace')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
