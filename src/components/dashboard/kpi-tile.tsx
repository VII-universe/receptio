import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sparkline } from './sparkline'

/** Změna proti předchozímu období: šipka + znaménko + procento (stav není jen barva). `neutral` = bez hodnocení lepší/horší. */
export function Delta({ current, previous, suffix, newLabel, neutral = false }: { current: number; previous: number; suffix: string; newLabel: string; neutral?: boolean }) {
  if (previous <= 0) return <span className="text-muted-foreground">{current > 0 ? newLabel : '—'}</span>
  const pct = Math.round(((current - previous) / previous) * 100)
  const flat = Math.abs(pct) < 3
  const Icon = flat ? ArrowRight : pct > 0 ? ArrowUpRight : ArrowDownRight
  const tone = flat || neutral ? 'text-muted-foreground' : pct > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-1 font-medium', tone)}>
      <Icon className="size-3.5" aria-hidden />
      {pct > 0 ? '+' : ''}
      {pct} %<span className="font-normal text-muted-foreground">{suffix}</span>
    </span>
  )
}

/** Dlaždice ukazatele: popisek, velké číslo, změna proti minulému období a miniaturní průběh. */
export function KpiTile({
  label,
  value,
  icon: Icon,
  spark,
  footer,
  hint,
}: {
  label: string
  value: string
  icon: LucideIcon
  spark?: number[]
  footer?: React.ReactNode
  hint?: React.ReactNode
}) {
  return (
    <div className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:ring-primary/30 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] dark:backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-primary/15 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
      <div className="relative flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20" aria-hidden>
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
      </div>
      <div className="relative flex items-end justify-between gap-3">
        <div className="app-glow-text text-3xl font-semibold tracking-[-0.03em] tabular-nums">{value}</div>
        {spark && spark.length > 1 && <Sparkline values={spark} className="h-8 w-24 shrink-0 text-primary/80" />}
      </div>
      {hint}
      {footer && <div className="relative mt-auto text-xs text-muted-foreground">{footer}</div>}
    </div>
  )
}
