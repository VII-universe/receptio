import Link from 'next/link'
import { AlertTriangle, ArrowUpRight, CheckCircle2, CreditCard, Phone, PhoneMissed, Bot, Hourglass, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AttentionItem {
  id: string
  tone: 'critical' | 'warning' | 'info'
  icon: LucideIcon
  title: string
  text: string
  href: string
  cta: string
}

const TONE = {
  critical: { box: 'border-red-500/30 bg-red-500/10', icon: 'bg-red-500/15 text-red-600 dark:text-red-300', label: 'text-red-700 dark:text-red-200' },
  warning: { box: 'border-amber-500/30 bg-amber-500/10', icon: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', label: 'text-amber-800 dark:text-amber-200' },
  info: { box: 'border-border bg-muted/40', icon: 'bg-primary/12 text-primary', label: 'text-foreground' },
} as const

export { AlertTriangle, CreditCard, Phone, PhoneMissed, Bot, Hourglass }

/** Co teď vyžaduje pozornost; když nic, krátké "vše v pořádku". Každá položka nese ikonu a text, ne jen barvu. */
export function Attention({ items, okLabel }: { items: AttentionItem[]; okLabel: string }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 className="size-5 shrink-0" aria-hidden /> {okLabel}
      </div>
    )
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((a) => {
        const tone = TONE[a.tone]
        return (
          <li key={a.id}>
            <Link href={a.href} className={cn('group flex h-full items-start gap-3 rounded-2xl border p-4 transition-colors hover:brightness-105', tone.box)}>
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', tone.icon)} aria-hidden>
                <a.icon className="size-4.5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm font-semibold', tone.label)}>{a.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{a.text}</span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-foreground/80">
                {a.cta}
                <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
