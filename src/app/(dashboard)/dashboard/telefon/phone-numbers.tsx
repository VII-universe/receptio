'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { SUPPORTED_COUNTRIES } from '@/lib/countries'

interface OwnedNumber {
  id: string
  phoneNumber: string
  agentName: string | null
  isActive: boolean
  monthlyCost: number | null
  costCurrency: string
}

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string | null
  region: string | null
}

const money = (amount: number, currency: string) =>
  currency === 'CZK' ? `${amount.toLocaleString('cs-CZ')} Kč` : `${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} ${currency === 'USD' ? '$' : currency}`

export function PhoneNumbers({
  numbers,
  assignableAgents,
  hasAgents,
  planAllowsNumbers,
  limitReached,
}: {
  numbers: OwnedNumber[]
  assignableAgents: { id: string; name: string }[]
  hasAgents: boolean
  planAllowsNumbers: boolean
  limitReached: boolean
}) {
  const router = useRouter()
  const [country, setCountry] = useState<string>('CZ')
  const [price, setPrice] = useState<{ amount: number; currency: string } | null>(null)
  const [noNumbers, setNoNumbers] = useState(false)
  const [available, setAvailable] = useState<AvailableNumber[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [releasing, setReleasing] = useState<string | null>(null)

  const [selected, setSelected] = useState<AvailableNumber | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [buying, setBuying] = useState(false)

  const canBuy = planAllowsNumbers && !limitReached && assignableAgents.length > 0
  const disabledReason = !planAllowsNumbers
    ? 'Available from the Starter plan'
    : limitReached
      ? 'You have reached the number limit for your plan'
      : assignableAgents.length === 0
        ? 'You have no agent without a number'
        : undefined

  async function loadAvailable() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/phone-numbers/available?country=${country}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Loading the numbers failed.')
      setAvailable(data.numbers)
      setPrice(data.price ?? null)
      setNoNumbers(!!data.noNumbers)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Loading the numbers failed.')
    } finally {
      setLoading(false)
    }
  }

  function openBuy(n: AvailableNumber) {
    setSelected(n)
    setAgentId(assignableAgents[0]?.id ?? null)
  }

  async function confirmBuy() {
    if (!selected || !agentId) return
    setBuying(true)
    try {
      const res = await fetch('/api/phone-numbers/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: selected.phoneNumber, agentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error([data.error, data.detail].filter(Boolean).join(': ') || 'The purchase failed.')
      }
      toast.add({ type: 'success', title: 'Number added' })
      setAvailable((list) => list?.filter((n) => n.phoneNumber !== selected.phoneNumber) ?? null)
      setSelected(null)
      router.refresh()
    } catch (e) {
      toast.add({
        type: 'error',
        title: 'Purchase failed',
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setBuying(false)
    }
  }

  async function release(n: OwnedNumber) {
    if (!window.confirm(`Release the number ${n.phoneNumber}? The number will be permanently released and will stop receiving calls.`)) {
      return
    }
    setReleasing(n.id)
    try {
      const res = await fetch(`/api/phone-numbers/${n.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Releasing failed.')
      toast.add({ type: 'success', title: 'Number released' })
      router.refresh()
    } catch (e) {
      toast.add({
        type: 'error',
        title: 'Releasing failed',
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setReleasing(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>My numbers</CardTitle>
        </CardHeader>
        <CardContent>
          {numbers.length === 0 ? (
            <p className="text-sm text-muted-foreground">You do not have any numbers yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Assigned agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monthly price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.phoneNumber}</TableCell>
                    <TableCell>{n.agentName ?? '–'}</TableCell>
                    <TableCell>
                      <Badge variant={n.isActive ? 'default' : 'secondary'}>
                        {n.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{n.monthlyCost === null ? '–' : `${money(n.monthlyCost, n.costCurrency)}/month`}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={releasing !== null}
                        onClick={() => release(n)}
                      >
                        {releasing === n.id ? 'Releasing…' : 'Release'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buy a new number</CardTitle>
          <CardDescription>A phone number your AI agent will answer.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!hasAgents ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">Create an agent first, to which you can assign the number.</p>
              <Link href="/dashboard/agents/new" className={buttonVariants()}>
                Create agent
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={country}
                items={SUPPORTED_COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.name} (${c.prefix})` }))}
                onValueChange={(v) => {
                  if (!v) return
                  setCountry(v)
                  setAvailable(null) // seznam patří k předchozí zemi
                  setNoNumbers(false)
                }}
              >
                <SelectTrigger className="w-64" aria-label="Country" disabled={!canBuy || loading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.prefix})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span title={disabledReason}>
                <Button onClick={loadAvailable} disabled={!canBuy || loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  Show available numbers
                </Button>
              </span>
            </div>
          )}
          {hasAgents && disabledReason && <p className="text-sm text-muted-foreground">{disabledReason}.</p>}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {loading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          )}

          {!loading && available && available.length === 0 && noNumbers && (
            <p className="text-sm text-muted-foreground">
              No numbers are currently available for this country. Try another country or contact support.
            </p>
          )}

          {!loading && available && available.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((n) => (
                <div key={n.phoneNumber} className="flex flex-col gap-3 rounded-xl border p-4">
                  <div>
                    <div className="font-semibold">{n.friendlyName}</div>
                    <div className="text-sm text-muted-foreground">
                      {[n.locality, n.region].filter(Boolean).join(', ') || 'Czech Republic'}
                    </div>
                  </div>
                  <div className="text-sm">{price ? `${money(price.amount, price.currency)}/month` : 'Price per Twilio'}</div>
                  <Button size="sm" onClick={() => openBuy(n)}>
                    Buy
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-sm text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">How it works</p>
          After you buy a number, Vapi automatically connects incoming calls to the selected agent.
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && !buying && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to agent</DialogTitle>
            <DialogDescription>
              The number {selected?.friendlyName}{price ? ` (${money(price.amount, price.currency)}/month)` : ''} will be purchased and billed to your
              Twilio account.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={agentId}
            onValueChange={setAgentId}
            items={assignableAgents.map((a) => ({ value: a.id, label: a.name }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {assignableAgents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" disabled={buying} onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button disabled={!agentId || buying} onClick={confirmBuy}>
              {buying && <Loader2 className="animate-spin" />}
              Confirm purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
