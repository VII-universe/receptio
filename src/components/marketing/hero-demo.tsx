'use client'

import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { DEMO_INDUSTRIES, type Speaker } from '@/lib/marketing/demo'
import { cn } from '@/lib/utils'
import { useDemoPlayer } from './demo-player'
import { IconPause, IconPlay, IconReplay, IconVolume, IconVolumeOff } from './icons'
import { INDUSTRY_META } from './industry'
import { OrbStatic } from './orb-static'

// WebGL orb se načte až v prohlížeči; do té doby stejně velký statický obraz (žádný posun rozvržení).
const AidaOrb = dynamic(() => import('./aida-orb'), { ssr: false, loading: () => <OrbStatic /> })

const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s || 0))
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`
}

/** Přehrávač ukázkového hovoru v hero: orb, výběr odvětví, ovládání, titulky a celý přepis jako text. */
export function HeroDemo() {
  const t = useTranslations('marketing.demo')
  const tc = useTranslations('marketing.common')
  const locale = useLocale()
  const player = useDemoPlayer()
  const { industry, status, transcript, segment, source, time, duration, muted } = player
  const script = t.raw(`scripts.${industry}`) as { s: Speaker; t: string }[]
  const { tint } = INDUSTRY_META[industry]
  const started = status !== 'idle'
  const playing = status === 'playing' || status === 'loading'
  const sameLang = source?.lang === locale
  const seg = segment >= 0 ? transcript?.segments[segment] : undefined
  const speaker: Speaker = seg?.speaker ?? script[0]?.s ?? 'aida'
  const total = duration || transcript?.duration || 0
  const industryName = t(`industries.${industry}`)

  // Titulek: slovo po slovu, když nahrávka mluví jazykem stránky; jinak přeložená replika.
  let subtitle: React.ReactNode = script[0]?.t
  if (started && seg) {
    if (sameLang && seg.words?.length) {
      subtitle = seg.words.map((w, i) => (
        <span key={i} className={cn('transition-opacity duration-200', time >= w.s - 0.04 ? 'opacity-100' : 'opacity-30')}>
          {w.w}{' '}
        </span>
      ))
    } else subtitle = script[segment]?.t ?? seg.text
  } else if (started && status !== 'ended') subtitle = ' '

  return (
    <div id="aida-demo" className="flex scroll-mt-28 flex-col items-center gap-6">
      <div className="relative w-full max-w-[30rem]">
        <AidaOrb tint={tint} levels={player.levels} active={playing} />
        <button
          type="button"
          disabled={!source}
          onClick={() => (status === 'ended' ? player.replay() : player.play())}
          aria-label={`${tc('listen')}: ${industryName}`}
          tabIndex={started && status !== 'ended' && status !== 'error' ? -1 : 0}
          className={cn(
            'absolute left-1/2 top-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-day shadow-[0_20px_50px_-12px_rgb(20_22_31/0.6)] transition-[opacity,transform] duration-500 hover:scale-105 disabled:cursor-not-allowed',
            started && status !== 'ended' && status !== 'error' && 'pointer-events-none scale-75 opacity-0'
          )}
        >
          {status === 'ended' ? <IconReplay size={30} /> : <IconPlay size={30} className="translate-x-0.5" />}
        </button>
      </div>

      <div
        role="group"
        aria-label={t('industryLabel')}
        className="grid w-full max-w-[30rem] grid-cols-2 gap-1.5 rounded-[1.75rem] border border-line bg-surface-2 p-1.5 sm:flex sm:w-auto sm:justify-center sm:rounded-full"
      >
        {DEMO_INDUSTRIES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={industry === id}
            onClick={() => player.select(id)}
            className={cn('min-h-11 rounded-full px-4 text-[0.9375rem] font-medium transition-colors', industry === id ? 'bg-ink text-day' : 'text-fg-soft hover:text-fg')}
          >
            {t(`industries.${id}`)}
          </button>
        ))}
      </div>

      {/* Ovládání (jen když ukázka běží nebo je pozastavená) */}
      <div className={cn('flex w-full max-w-[30rem] items-center gap-2 transition-opacity duration-300', !started && 'invisible opacity-0')}>
        <button
          type="button"
          onClick={player.toggle}
          aria-label={playing ? t('pause') : status === 'paused' ? t('resume') : t('play')}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-day"
        >
          {playing ? <IconPause size={18} /> : <IconPlay size={18} className="translate-x-px" />}
        </button>
        <span className="mk-mono w-10 shrink-0 text-right text-xs text-fg-soft">{fmt(time)}</span>
        <input
          type="range"
          min={0}
          max={total || 1}
          step={0.1}
          value={Math.min(time, total || 1)}
          onChange={(e) => player.seek(Number(e.target.value))}
          aria-label={t('progress')}
          aria-valuetext={`${fmt(time)} / ${fmt(total)}`}
          style={{ '--pct': `${total ? (time / total) * 100 : 0}%` } as React.CSSProperties}
          className="mk-seek min-w-0 flex-1"
        />
        <span className="mk-mono w-10 shrink-0 text-xs text-fg-soft">{fmt(total)}</span>
        <button
          type="button"
          onClick={() => player.setMuted(!muted)}
          aria-label={muted ? t('unmute') : t('mute')}
          aria-pressed={muted}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg hover:bg-fg/8"
        >
          {muted ? <IconVolumeOff size={20} /> : <IconVolume size={20} />}
        </button>
        <button type="button" onClick={player.replay} aria-label={t('replay')} className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg hover:bg-fg/8">
          <IconReplay size={20} />
        </button>
      </div>

      {/* Titulky jsou vizuální vrstva; přístupný přepis je níže v <details>. */}
      <div aria-hidden className="flex min-h-[8.5rem] w-full max-w-[30rem] flex-col items-center text-center">
        <p className={cn('mk-mono flex items-center gap-2 text-xs uppercase tracking-[0.08em]', speaker === 'aida' ? 'text-accent-text' : 'text-[#2a5db0]')}>
          <span className={cn('size-2 rounded-full', speaker === 'aida' ? 'bg-aida' : 'bg-caller')} />
          {speaker === 'aida' ? t('aida') : t('caller')}
        </p>
        <p className={cn('mt-2 text-balance text-lg leading-snug transition-opacity', !started && 'opacity-70')}>{subtitle}</p>
      </div>
      <p className="-mt-4 max-w-[30rem] text-center text-xs text-fg-soft">
        {source?.placeholder ? t('placeholder') : tc('illustrative')}
        {source && !sameLang && <> · {t('otherLanguage')}</>}
      </p>
      {status === 'error' && (
        <p role="alert" className="-mt-4 text-sm text-fg-soft">
          {t('error')}
        </p>
      )}
      {!source && <p className="-mt-4 text-sm text-fg-soft">{t('unavailable')}</p>}

      <details className="mk-faq w-full max-w-[30rem] rounded-2xl border border-line bg-surface-2 px-5 py-4 text-left">
        <summary className="flex items-center justify-between text-[0.9375rem] font-medium">{t('transcript')}</summary>
        <ol className="mt-4 flex flex-col gap-3 text-[0.9375rem] leading-relaxed">
          {script.map((line, i) => (
            <li key={i} aria-current={started && i === segment ? 'true' : undefined} className={cn('rounded-lg transition-colors', started && i === segment && 'bg-aida/10')}>
              <span className={cn('font-semibold', line.s === 'aida' ? 'text-accent-text' : 'text-fg')}>{line.s === 'aida' ? t('aida') : t('caller')}:</span>{' '}
              <span className="text-fg-soft">{line.t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-fg-soft">
          {source?.placeholder ? t('placeholder') : t('note')}
          {source && !sameLang && <> {t('otherLanguage')}</>}
        </p>
      </details>
    </div>
  )
}
