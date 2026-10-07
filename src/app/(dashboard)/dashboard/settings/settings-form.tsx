'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { normalizePhone, notificationFormSchema, type NotificationFormData } from '@/lib/notification-schema'

export function SettingsForm({ initial }: { initial: NotificationFormData }) {
  const router = useRouter()
  const t = useTranslations('settings')
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NotificationFormData>({ resolver: zodResolver(notificationFormSchema), defaultValues: initial })

  async function onSubmit(values: NotificationFormData) {
    try {
      const res = await fetch('/api/workspaces/notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationEmail: values.email.trim() || null,
          notificationSms: normalizePhone(values.sms) || null,
          notificationsEnabled: values.enabled,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('saveFailed'))
      toast.add({ type: 'success', title: t('notificationsSaved') })
      router.refresh()
    } catch (e) {
      toast.add({
        type: 'error',
        title: t('saveFailed'),
        description: e instanceof Error ? e.message : undefined,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{t('callNotifications')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="enabled"
              render={({ field }) => (
                <Switch id="enabled" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="enabled">{t('notificationsEnabled')}</Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t('notificationEmail')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('emailHint')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sms">{t('smsLabel')}</Label>
            <Input
              id="sms"
              type="tel"
              placeholder="+420 777 123 456"
              aria-invalid={!!errors.sms}
              {...register('sms')}
            />
            {errors.sms ? (
              <p className="text-sm text-destructive">{errors.sms.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('smsHint')}</p>
            )}
          </div>

          <Button type="submit" className="self-start" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {t('saveNotifications')}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
