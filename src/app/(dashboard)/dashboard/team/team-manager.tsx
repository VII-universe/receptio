'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'

type Role = 'org:admin' | 'org:member'

export interface MemberRow {
  userId: string
  name: string
  email: string
  imageUrl: string
  role: Role
  isSelf: boolean
  isOwner: boolean
}

export interface InvitationRow {
  id: string
  email: string
  role: Role
  createdAt: string
}

async function api(url: string, method: string, body?: unknown, fallbackError = 'The operation failed.') {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? fallbackError)
  return data
}

export function TeamManager({
  members,
  invitations,
  limit,
  canManage,
}: {
  members: MemberRow[]
  invitations: InvitationRow[]
  limit: number | null // null = neomezeno
  canManage: boolean
}) {
  const router = useRouter()
  const t = useTranslations('team')
  const tc = useTranslations('common')
  const locale = useLocale()
  const ROLE_OPTIONS = [
    { value: 'org:admin', label: t('admin') },
    { value: 'org:member', label: t('member') },
  ]
  const roleLabel = (r: Role) => ROLE_OPTIONS.find((o) => o.value === r)!.label
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('org:member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const used = members.length + invitations.length
  const limitReached = limit !== null && used >= limit
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0

  async function run(key: string, action: () => Promise<unknown>, okTitle: string, failTitle: string) {
    setBusy(key)
    try {
      await action()
      toast.add({ type: 'success', title: okTitle })
      router.refresh()
    } catch (e) {
      toast.add({ type: 'error', title: failTitle, description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  async function invite() {
    setInviting(true)
    setInviteError(null)
    try {
      await api('/api/team/invite', 'POST', { email: email.trim(), role }, t('operationFailed'))
      toast.add({ type: 'success', title: t('inviteSent') })
      setOpen(false)
      setEmail('')
      router.refresh()
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : t('sendFailed'))
    } finally {
      setInviting(false)
    }
  }

  const inviteButton = (
    <span title={limitReached ? t('upgradeForMore') : undefined}>
      <Button disabled={limitReached} onClick={() => { setInviteError(null); setOpen(true) }}>
        <Plus /> {t('inviteMember')}
      </Button>
    </span>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {t('title')}{' '}
          <span className="text-base font-normal text-muted-foreground">
            ({members.length} / {limit ?? '∞'})
          </span>
        </h1>
        {canManage && inviteButton}
      </div>

      {limit !== null && (
        <div className="flex flex-col gap-1">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={percent >= 100 ? 'h-full bg-red-500' : 'h-full bg-blue-500'} style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('seatsUsed', { used, limit })}
            {invitations.length > 0 && ` ${t('includingPending', { count: invitations.length })}`}.
            {limitReached && canManage && (
              <>
                {' '}
                <Link href="/dashboard/billing" className="underline">
                  {t('upgradeLink')}
                </Link>
              </>
            )}
          </p>
        </div>
      )}

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                {canManage && <TableHead className="text-right">{t('actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const locked = m.isSelf || m.isOwner // sám sebe ani zakladatele nelze měnit ani odebrat
                return (
                  <TableRow key={m.userId}>
                    <TableCell>
                      {m.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt="" width={32} height={32} className="size-8 rounded-full border object-cover" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {m.name} {m.isSelf && <span className="text-xs text-muted-foreground">{t('you')}</span>}
                    </TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      {canManage && !locked ? (
                        <Select
                          value={m.role}
                          items={ROLE_OPTIONS}
                          onValueChange={(v) =>
                            v && v !== m.role &&
                            run(m.userId, () => api(`/api/team/members/${m.userId}`, 'PATCH', { role: v }), t('roleChanged'), t('roleChangeFailed'))
                          }
                        >
                          <SelectTrigger className="w-40" disabled={busy !== null}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={m.role === 'org:admin' ? 'default' : 'secondary'}>
                          {m.isOwner ? t('owner') : roleLabel(m.role)}
                        </Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {!locked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={busy !== null}
                            onClick={() => {
                              if (!window.confirm(t('removeConfirm', { name: m.name !== '–' ? m.name : m.email }))) return
                              run(m.userId, () => api(`/api/team/members/${m.userId}`, 'DELETE'), t('memberRemoved'), t('removeFailed'))
                            }}
                          >
                            {busy === m.userId ? t('removing') : t('removeMember')}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>{t('pendingTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noPending')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('email')}</TableHead>
                    <TableHead>{t('role')}</TableHead>
                    <TableHead>{t('sent')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.email}</TableCell>
                      <TableCell>{roleLabel(i.role)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(i.createdAt).toLocaleDateString(locale, { timeZone: 'Europe/Prague', day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy !== null}
                          onClick={() =>
                            run(i.id, () => api(`/api/team/invitations/${i.id}`, 'DELETE'), t('inviteCanceled'), t('cancelFailed'))
                          }
                        >
                          {busy === i.id ? t('canceling') : tc('cancel')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && !inviting && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inviteMember')}</DialogTitle>
            <DialogDescription>{t('inviteDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="inviteEmail">{t('email')}</Label>
            <Input
              id="inviteEmail"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('role')}</Label>
            <Select value={role} items={ROLE_OPTIONS} onValueChange={(v) => v && setRole(v as Role)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('roleHelp')}
            </p>
          </div>
          {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={inviting}>
              {tc('cancel')}
            </Button>
            <Button onClick={invite} disabled={inviting || !email.trim()}>
              {inviting && <Loader2 className="animate-spin" />}
              {t('sendInvitation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
