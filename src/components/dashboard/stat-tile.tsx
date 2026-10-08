import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Statistická dlaždice: ikona v akcentové dlaždici, velké číslo, volitelný doplněk (trend, ukazatel). */
export function StatTile({
  label,
  value,
  icon: Icon,
  children,
  className,
}: {
  label: string
  value: string
  icon?: LucideIcon
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:ring-primary/30 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_60px_-28px_rgb(0_0_0/0.7)] dark:backdrop-blur-xl',
        className
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-primary/15 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
      <div className="relative flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20" aria-hidden>
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div className="app-glow-text relative text-3xl font-semibold tracking-[-0.03em] tabular-nums">{value}</div>
      {children && <div className="relative text-xs text-muted-foreground">{children}</div>}
    </div>
  )
}
