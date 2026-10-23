import { cn } from '@/lib/utils'
import type { DemoIndustry } from '@/lib/marketing/demo'
import { IconCheck, IconPhone } from './icons'
import { INDUSTRY_META } from './industry'

export type CallStatus = 'incoming' | 'talking' | 'done'

const STATUS_STYLE: Record<CallStatus, string> = {
  incoming: 'bg-caller/15 text-[#1f4f9a]',
  talking: 'bg-aida/15 text-[#9a3a10]',
  done: 'bg-ok/15 text-[#1c6b45]',
}

/** Karta hovoru jako fyzický objekt: příchozí → Aida mluví → vyřízeno (se shrnutím). */
export function CallCard({
  status,
  time,
  industry,
  business,
  number,
  reason,
  result,
  labels,
  className,
}: {
  status: CallStatus
  time: string
  industry: DemoIndustry
  business: string
  number: string
  reason: string
  result?: string
  labels: { status: Record<CallStatus, string>; summary: string }
  className?: string
}) {
  const { Icon, tint } = INDUSTRY_META[industry]
  return (
    <article className={cn('w-full max-w-[26rem] rounded-[1.5rem] bg-white p-5 text-ink shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_28px_60px_-28px_rgb(14_22_48/0.55)] ring-1 ring-ink/8', className)}>
      <header className="flex items-center justify-between gap-3">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLE[status])}>
          {status === 'done' ? <IconCheck size={14} /> : <IconPhone size={14} />}
          {labels.status[status]}
        </span>
        <span className="mk-mono text-sm text-ink-soft">{time}</span>
      </header>
      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}26`, color: tint }}>
          <Icon size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{business}</p>
          <p className="mk-mono truncate text-[0.8125rem] text-ink-soft">{number}</p>
        </div>
      </div>
      <p className="mt-4 text-[1.0625rem] leading-snug">{reason}</p>
      {result && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-ok/10 px-3.5 py-3 text-[0.9375rem] leading-snug">
          <IconCheck size={18} className="mt-0.5 shrink-0 text-[#1c6b45]" />
          <p>
            <span className="sr-only">{labels.summary}: </span>
            {result}
          </p>
        </div>
      )}
    </article>
  )
}
