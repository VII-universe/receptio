'use client'

import { useTranslations } from 'next-intl'
import type { DemoIndustry, Speaker } from '@/lib/marketing/demo'
import { cn } from '@/lib/utils'
import { useDemoPlayer } from './demo-player'

/**
 * Text karty odvětví: v klidu scénář, během přehrávání téhle ukázky právě mluvená replika
 * (v jazyce stránky) a průběh nahrávky. Stejná výška v obou stavech, nic neposkočí.
 */
export function IndustryLive({ industry, scenario }: { industry: DemoIndustry; scenario: string }) {
  const t = useTranslations('marketing.demo')
  const { industry: current, status, segment, time, duration, transcript } = useDemoPlayer()
  const live = current === industry && (status === 'playing' || status === 'paused' || status === 'loading')
  const script = t.raw(`scripts.${industry}`) as { s: Speaker; t: string }[]
  const line = segment >= 0 ? script[segment] : undefined
  const total = duration || transcript?.duration || 0

  return (
    <div className="relative min-h-[7.5rem]">
      <p className={cn('text-fg-soft transition-opacity duration-300', live && 'invisible opacity-0')}>{scenario}</p>
      {live && (
        <div className="absolute inset-0 flex flex-col">
          <p className={cn('mk-mono flex items-center gap-2 text-xs uppercase tracking-[0.08em]', line?.s === 'caller' ? 'text-[#2a5db0]' : 'text-accent-text')}>
            <span className={cn('size-2 rounded-full', line?.s === 'caller' ? 'bg-caller' : 'bg-aida')} />
            {line ? (line.s === 'aida' ? t('aida') : t('caller')) : t('loading')}
          </p>
          <p className="mt-2 line-clamp-3 text-[0.9375rem] leading-snug">{line?.t ?? ' '}</p>
          <span className="mt-auto block h-1 overflow-hidden rounded-full bg-fg/10" role="presentation">
            <span className="block h-full rounded-full bg-aida transition-[width] duration-200" style={{ width: `${total ? Math.min(100, (time / total) * 100) : 0}%` }} />
          </span>
        </div>
      )}
    </div>
  )
}
