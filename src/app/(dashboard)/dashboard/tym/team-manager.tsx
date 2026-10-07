'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

const ROLE_OPTIONS = [
  { value: 'org:admin', label: 'Admin' },
  { value: 'org:member', label: 'Member' },
]
const roleLabel = (r: Role) => ROLE_OPTIONS.find((o) => o.value === r)!.label

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'The operation failed.')
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
      await api('/api/team/invite', 'POST', { email: email.trim(), role })
      toast.add({ type: 'success', title: 'Invitation sent' })
      setOpen(false)
      setEmail('')
      router.refresh()
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Sending failed.')
    } finally {
      setInviting(false)
    }
  }

  const inviteButton = (
    <span title={limitReached ? 'Upgrade your plan for more members' : undefined}>
      <Button disabled={limitReached} onClick={() => { setInviteError(null); setOpen(true) }}>
        <Plus /> Invite member
      </Button>
    </span>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Team{' '}
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
            {used} of {limit} seats used
            {invitations.length > 0 && ` (including ${invitations.length} pending invitations)`}.
            {limitReached && canManage && (
              <>
                {' '}
                <Link href="/dashboard/fakturace" className="underline">
                  Upgrade your plan for more members.
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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
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
                      {m.name} {m.isSelf && <span className="text-xs text-muted-foreground">(vy)</span>}
                    </TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      {canManage && !locked ? (
                        <Select
                          value={m.role}
                          items={ROLE_OPTIONS}
                          onValueChange={(v) =>
                            v && v !== m.role &&
                            run(m.userId, () => api(`/api/team/members/${m.userId}`, 'PATCH', { role: v }), 'Role changed', 'Changing the role failed')
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
                          {m.isOwner ? 'Owner' : roleLabel(m.role)}
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
                              if (!window.confirm(`Remove ${m.name !== '–' ? m.name : m.email} from the team? They will lose access to the workspace.`)) return
                              run(m.userId, () => api(`/api/team/members/${m.userId}`, 'DELETE'), 'Member removed', 'Removing failed')
                            }}
                          >
                            {busy === m.userId ? 'Removing…' : 'Remove'}
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
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.email}</TableCell>
                      <TableCell>{roleLabel(i.role)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(i.createdAt).toLocaleDateString('en-GB', { timeZone: 'Europe/Prague', day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy !== null}
                          onClick={() =>
                            run(i.id, () => api(`/api/team/invitations/${i.id}`, 'DELETE'), 'Invitation canceled', 'Canceling failed')
                          }
                        >
                          {busy === i.id ? 'Canceling…' : 'Cancel'}
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
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>The invitee will receive an email with a link to join your workspace.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="inviteEmail">Email</Label>
            <Input
              id="inviteEmail"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Role</Label>
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
              A member can only read the overview and calls. An admin can do everything, including managing the team.
            </p>
          </div>
          {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button onClick={invite} disabled={inviting || !email.trim()}>
              {inviting && <Loader2 className="animate-spin" />}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
