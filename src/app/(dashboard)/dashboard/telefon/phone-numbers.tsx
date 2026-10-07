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
  currency === 'CZK' ? `${amount.toLocaleString('cs-CZ')} Kč` : `${amount.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${currency === 'USD' ? '$' : currency}`

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
    ? 'Dostupné od plánu Starter'
    : limitReached
      ? 'Dosáhli jste limitu čísel pro váš plán'
      : assignableAgents.length === 0
        ? 'Nemáte agenta bez čísla'
        : undefined

  async function loadAvailable() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/phone-numbers/available?country=${country}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Načtení čísel selhalo.')
      setAvailable(data.numbers)
      setPrice(data.price ?? null)
      setNoNumbers(!!data.noNumbers)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Načtení čísel selhalo.')
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
        throw new Error([data.error, data.detail].filter(Boolean).join(': ') || 'Koupě se nezdařila.')
      }
      toast.add({ type: 'success', title: 'Číslo přidáno' })
      setAvailable((list) => list?.filter((n) => n.phoneNumber !== selected.phoneNumber) ?? null)
      setSelected(null)
      router.refresh()
    } catch (e) {
      toast.add({
        type: 'error',
        title: 'Koupě se nezdařila',
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setBuying(false)
    }
  }

  async function release(n: OwnedNumber) {
    if (!window.confirm(`Uvolnit číslo ${n.phoneNumber}? Číslo bude trvale uvolněno a přestane přijímat hovory.`)) {
      return
    }
    setReleasing(n.id)
    try {
      const res = await fetch(`/api/phone-numbers/${n.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Uvolnění se nezdařilo.')
      toast.add({ type: 'success', title: 'Číslo bylo uvolněno' })
      router.refresh()
    } catch (e) {
      toast.add({
        type: 'error',
        title: 'Uvolnění se nezdařilo',
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
          <CardTitle>Moje čísla</CardTitle>
        </CardHeader>
        <CardContent>
          {numbers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím nemáte žádné číslo</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Číslo</TableHead>
                  <TableHead>Přiřazený agent</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Měsíční cena</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.phoneNumber}</TableCell>
                    <TableCell>{n.agentName ?? '–'}</TableCell>
                    <TableCell>
                      <Badge variant={n.isActive ? 'default' : 'secondary'}>
                        {n.isActive ? 'Aktivní' : 'Neaktivní'}
                      </Badge>
                    </TableCell>
                    <TableCell>{n.monthlyCost === null ? '–' : `${money(n.monthlyCost, n.costCurrency)}/měsíc`}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={releasing !== null}
                        onClick={() => release(n)}
                      >
                        {releasing === n.id ? 'Uvolňuji…' : 'Uvolnit'}
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
          <CardTitle>Koupit nové číslo</CardTitle>
          <CardDescription>Telefonní číslo, na které bude odpovídat váš AI agent.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!hasAgents ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">Nejdřív vytvořte agenta, kterému číslo přiřadíte.</p>
              <Link href="/dashboard/agents/new" className={buttonVariants()}>
                Vytvořit agenta
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
                <SelectTrigger className="w-64" aria-label="Země" disabled={!canBuy || loading}>
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
                  Zobrazit dostupná čísla
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
              Pro tuto zemi nejsou momentálně dostupná čísla. Zkuste jinou zemi nebo kontaktujte podporu.
            </p>
          )}

          {!loading && available && available.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((n) => (
                <div key={n.phoneNumber} className="flex flex-col gap-3 rounded-xl border p-4">
                  <div>
                    <div className="font-semibold">{n.friendlyName}</div>
                    <div className="text-sm text-muted-foreground">
                      {[n.locality, n.region].filter(Boolean).join(', ') || 'Česká republika'}
                    </div>
                  </div>
                  <div className="text-sm">{price ? `${money(price.amount, price.currency)}/měsíc` : 'Cena dle Twilio'}</div>
                  <Button size="sm" onClick={() => openBuy(n)}>
                    Koupit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-sm text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Jak to funguje</p>
          Po koupi čísla vám Vapi automaticky propojí příchozí hovory s vybraným agentem.
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && !buying && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přiřadit agentovi</DialogTitle>
            <DialogDescription>
              Číslo {selected?.friendlyName}{price ? ` (${money(price.amount, price.currency)}/měsíc)` : ''} bude zakoupeno a účtováno na vašem
              Twilio účtu.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={agentId}
            onValueChange={setAgentId}
            items={assignableAgents.map((a) => ({ value: a.id, label: a.name }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Vyberte agenta" />
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
              Zrušit
            </Button>
            <Button disabled={!agentId || buying} onClick={confirmBuy}>
              {buying && <Loader2 className="animate-spin" />}
              Potvrdit koupi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
