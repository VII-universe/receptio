'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { DemoIndustry } from '@/lib/marketing/demo'
import { cn } from '@/lib/utils'
import { useDemoPlayer } from './demo-player'
import { IconPause, IconPlay } from './icons'
import { INDUSTRY_META } from './industry'

/** Hero CTA „Poslechni si Aidu“: spustí ukázku a na mobilu posune stránku k přehrávači. */
export function ListenButton({ className }: { className?: string }) {
  const tc = useTranslations('marketing.common')
  const player = useDemoPlayer()
  const playing = player.status === 'playing' || player.status === 'loading'

  return (
    <button
      type="button"
      disabled={!player.source}
      aria-pressed={playing}
      onClick={() => {
        if (playing) return player.pause()
        player.play()
        const el = document.getElementById('aida-demo')
        const r = el?.getBoundingClientRect()
        if (el && r && (r.top > window.innerHeight * 0.6 || r.bottom < 0)) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }}
      className={cn('mk-btn mk-btn-ghost', className)}
    >
      <span aria-hidden className="relative flex size-2.5">
        <span className={cn('absolute inset-0 rounded-full bg-aida/70', !playing && 'animate-ping motion-reduce:animate-none')} />
        <span className="relative size-2.5 rounded-full bg-aida" />
      </span>
      {tc('listen')}
    </button>
  )
}

/**
 * Tlačítko ukázky v kartě odvětví: stejný přehrávač jako hero. Mini orb pulzuje podle hlasitosti,
 * dokud hraje právě toto odvětví (čte úrovně v refu, bez překreslování Reactu).
 */
export function IndustryPlayButton({ industry, label }: { industry: DemoIndustry; label: string }) {
  const t = useTranslations('marketing.demo')
  const player = useDemoPlayer()
  const orb = useRef<HTMLSpanElement>(null)
  const mine = player.industry === industry
  const playing = mine && (player.status === 'playing' || player.status === 'loading')
  const { tint } = INDUSTRY_META[industry]
  const levels = player.levels

  useEffect(() => {
    const el = orb.current
    if (!el || !playing) return
    let raf = 0
    const loop = () => {
      const a = levels.current.amp
      el.style.transform = `scale(${1 + a * 0.45})`
      el.style.boxShadow = `0 0 ${6 + a * 26}px ${a * 6}px ${tint}66`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      el.style.transform = ''
      el.style.boxShadow = ''
    }
  }, [playing, levels, tint])

  return (
    <button
      type="button"
      disabled={!player.source && !mine}
      aria-pressed={playing}
      onClick={() => (playing ? player.pause() : player.play(industry))}
      className="group inline-flex min-h-11 items-center gap-3 rounded-full border border-line py-1.5 pl-1.5 pr-4 text-[0.9375rem] font-medium transition-colors hover:border-fg"
    >
      <span
        ref={orb}
        aria-hidden
        className="flex size-9 items-center justify-center rounded-full transition-transform duration-75"
        style={{ background: `radial-gradient(circle at 35% 30%, #fff3e8, ${tint} 55%)` }}
      >
        {playing ? <IconPause size={13} className="text-ink" /> : <IconPlay size={14} className="translate-x-px text-ink" />}
      </span>
      {playing ? t('pause') : label}
    </button>
  )
}
