'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Osobní profil z Clerk; úpravy se dělají v Clerk modalu "Spravovat účet". */
export function ProfileTab() {
  const t = useTranslations('settings')
  const { isLoaded, user } = useUser()
  const { openUserProfile } = useClerk()

  if (!isLoaded) return <Skeleton className="h-48 rounded-xl" />
  if (!user) return <p className="text-sm text-muted-foreground">{t('profileLoadFailed')}</p>

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || '–'
  const email = user.primaryEmailAddress?.emailAddress ?? '–'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tabProfile')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="relative flex items-center gap-5 overflow-hidden rounded-2xl border border-primary/20 bg-primary/8 p-5">
          <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-primary/25 blur-3xl" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.imageUrl} alt="" width={72} height={72} className="relative size-[72px] rounded-full object-cover ring-2 ring-primary/40 ring-offset-2 ring-offset-background" />
          <dl className="relative flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('fullName')}</dt>
              <dd className="text-base font-semibold">{name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('email')}</dt>
              <dd className="font-medium">{email}</dd>
            </div>
          </dl>
        </div>
        <Button variant="outline" className="self-start" onClick={() => openUserProfile()}>
          {t('manageAccount')}
        </Button>
      </CardContent>
    </Card>
  )
}
