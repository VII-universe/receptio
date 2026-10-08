import 'server-only'
import { clerkClient } from '@clerk/nextjs/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { isPlanId, PLAN_LIMITS, type PlanId } from '@/lib/billing/plans'
import { planState } from '@/lib/billing/get-workspace-plan'
import { PLAN_PRICES } from '@/lib/stripe/plans'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Workspace } from '@/types'

export const PAGE_SIZE = 50

// Sloupce, které admin vidí; Stripe ID zákazníka se v seznamu neukazuje (jen ikona), klíče a hashe se nevybírají.
const LIST_COLUMNS =
  'id, name, clerk_user_id, plan, plan_status, minutes_used, billing_period_end, trial_ends_at, calls_paused, stripe_customer_id, stripe_subscription_id, created_at'

export interface AdminOverview {
  workspaces: number
  paid: number
  trials: number
  minutes: number
  paused: number
  mrr: { CZK: number; EUR: number }
  recent: AdminListRow[]
}

export type AdminListRow = Pick<
  Workspace,
  'id' | 'name' | 'clerk_user_id' | 'plan' | 'plan_status' | 'minutes_used' | 'billing_period_end' | 'trial_ends_at' | 'calls_paused' | 'stripe_customer_id' | 'stripe_subscription_id' | 'created_at'
> & { minutesLimit: number; minutesUsed: number }

function toListRow(w: Omit<AdminListRow, 'minutesLimit' | 'minutesUsed'>): AdminListRow {
  const expired = w.billing_period_end && new Date(w.billing_period_end) <= new Date()
  return { ...w, minutesUsed: expired ? 0 : w.minutes_used, minutesLimit: PLAN_LIMITS[planState(w).plan].minutesPerMonth }
}

export async function getOverview(): Promise<AdminOverview> {
  await requireAdmin()
  const supabase = createAdminClient()
  const [stats, recent] = await Promise.all([
    supabase.rpc('admin_overview_stats'),
    supabase.from('workspaces').select(LIST_COLUMNS).order('created_at', { ascending: false }).limit(10),
  ])
  if (stats.error) throw stats.error
  if (recent.error) throw recent.error
  const s = stats.data as { workspaces: number; paid: number; trials: number; minutes: number; paused: number; paid_by_plan: { currency: 'CZK' | 'EUR'; plan: string; count: number }[] }

  // MRR odhad z ceníku (PLAN_PRICES) podle plánu a měny; skutečné tržby jsou ve Stripe.
  const mrr = { CZK: 0, EUR: 0 }
  for (const r of s.paid_by_plan) {
    if (isPlanId(r.plan) && (r.currency === 'CZK' || r.currency === 'EUR')) mrr[r.currency] += PLAN_PRICES[r.plan as PlanId][r.currency] * r.count
  }
  return { workspaces: s.workspaces, paid: s.paid, trials: s.trials, minutes: s.minutes, paused: s.paused, mrr, recent: recent.data.map(toListRow) }
}

export interface ListParams {
  q: string
  plan: string // '' = všechny
  paused: boolean
  sub: '' | '1' | '0' // s předplatným / bez
  sort: 'created_at' | 'minutes_used' | 'plan'
  dir: 'asc' | 'desc'
  page: number
}

const SORTS = ['created_at', 'minutes_used', 'plan'] as const

export function parseListParams(sp: Record<string, string | string[] | undefined>): ListParams {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? ''
  const sort = (SORTS as readonly string[]).includes(one('sort')) ? (one('sort') as ListParams['sort']) : 'created_at'
  return {
    q: one('q').trim().slice(0, 100),
    plan: isPlanId(one('plan')) ? one('plan') : '',
    paused: one('paused') === '1',
    sub: one('sub') === '1' ? '1' : one('sub') === '0' ? '0' : '',
    sort,
    dir: one('dir') === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, parseInt(one('page'), 10) || 1),
  }
}

export async function listWorkspaces(p: ListParams): Promise<{ rows: AdminListRow[]; total: number }> {
  await requireAdmin()
  let q = createAdminClient().from('workspaces').select(LIST_COLUMNS, { count: 'exact' })
  if (p.q) q = q.ilike('name', `%${p.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`) // % a _ ve hledání jsou obyčejné znaky
  if (p.plan) q = q.eq('plan', p.plan)
  if (p.paused) q = q.eq('calls_paused', true)
  if (p.sub === '1') q = q.not('stripe_subscription_id', 'is', null)
  if (p.sub === '0') q = q.is('stripe_subscription_id', null)
  q = q.order(p.sort, { ascending: p.dir === 'asc' }).order('id') // druhý klíč drží stránkování stabilní
  const from = (p.page - 1) * PAGE_SIZE
  const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1)
  if (error) throw error
  return { rows: data.map(toListRow), total: count ?? 0 }
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  await requireAdmin()
  const { data, error } = await createAdminClient().from('workspaces').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Workspace | null
}

export async function getAuditLog(workspaceId: string) {
  await requireAdmin()
  const { data, error } = await createAdminClient()
    .from('admin_audit_log')
    .select('id, admin_user_id, action, old_value, new_value, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

export interface OwnerInfo {
  email: string | null
  name: string
  createdAt: number | null
}

// Krátká paměťová cache (na instanci serveru), ať se Clerk nevolá při každém zobrazení stránky.
const OWNER_TTL_MS = 5 * 60 * 1000
const ownerCache = new Map<string, { at: number; info: OwnerInfo }>()

/**
 * Vlastníci workspace podle Clerk user ID (workspace.clerk_user_id). Jedním voláním getUserList na stránku
 * místo volání pro každý řádek; ID se dělí do dávek po 10 a dávky běží souběžně.
 */
export async function getOwners(userIds: string[]): Promise<Map<string, OwnerInfo>> {
  await requireAdmin()
  const result = new Map<string, OwnerInfo>()
  const missing: string[] = []
  for (const id of new Set(userIds)) {
    const hit = ownerCache.get(id)
    if (hit && Date.now() - hit.at < OWNER_TTL_MS) result.set(id, hit.info)
    else missing.push(id)
  }
  if (missing.length > 0) {
    const client = await clerkClient()
    const batches: string[][] = []
    for (let i = 0; i < missing.length; i += 10) batches.push(missing.slice(i, i + 10))
    const lists = await Promise.all(
      batches.map((userId) => client.users.getUserList({ userId, limit: 10 }).catch((e) => {
        console.error('Admin: failed to load owners from Clerk', e)
        return null
      }))
    )
    for (const list of lists) {
      for (const u of list?.data ?? []) {
        const info: OwnerInfo = {
          email: u.primaryEmailAddress?.emailAddress ?? null,
          name: [u.firstName, u.lastName].filter(Boolean).join(' '),
          createdAt: u.createdAt,
        }
        ownerCache.set(u.id, { at: Date.now(), info })
        result.set(u.id, info)
      }
    }
  }
  return result
}
