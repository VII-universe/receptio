'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatClock } from '@/lib/calls'
import { cn } from '@/lib/utils'
import type { TranscriptMessage } from '@/types'

const BARS = 72
const SPEEDS = [1, 1.5, 2] as const

/** Stálý "otisk" hovoru: stejná vlna při každém načtení, bez nutnosti stahovat a analyzovat audio. */
function waveform(seed: string): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const out: number[] = []
  let prev = 0.5
  for (let i = 0; i < BARS; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    const r = (h % 1000) / 1000
    prev = prev * 0.45 + r * 0.55 // plynulejší křivka než čistý šum
    const envelope = 0.55 + 0.45 * Math.sin((i / BARS) * Math.PI)
    out.push(Math.max(0.14, Math.min(1, prev * 1.25 * envelope + 0.08)))
  }
  return out
}

interface Props {
  callId: string
  recordingUrl: string | null
  durationSeconds: number
  messages: TranscriptMessage[]
  fallbackTranscript: string | null
  labels: { play: string; transcript: string; agent: string; customer: string; noTranscript: string; open: string }
}

/** Přehrávač nahrávky se vlnou, rychlostmi a přepisem synchronizovaným s přehráváním (klik na řádek přeskočí na místo v hovoru). */
export function CallPlayback({ callId, recordingUrl, durationSeconds, messages, fallbackTranscript, labels }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLButtonElement | HTMLDivElement | null)[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(durationSeconds)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const bars = useMemo(() => waveform(callId), [callId])
  const hasAudio = !!recordingUrl

  const progress = duration > 0 ? Math.min(1, time / duration) : 0
  const active = useMemo(() => {
    if (!hasAudio || (time === 0 && !playing)) return -1
    let idx = -1
    messages.forEach((m, i) => {
      if (m.secondsFromStart <= time + 0.25) idx = i
    })
    return idx
  }, [messages, time, playing, hasAudio])

  // Aktivní řádek držíme v zorném poli, ale jen uvnitř seznamu (nescrollujeme celou stránku).
  useEffect(() => {
    const list = listRef.current
    const el = lineRefs.current[active]
    if (!playing || !list || !el) return
    const top = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2
    list.scrollTo({ top, behavior: 'smooth' })
  }, [active, playing])

  const seek = useCallback((seconds: number, play = false) => {
    const a = audioRef.current
    if (!a) return
    const max = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : duration
    a.currentTime = Math.max(0, Math.min(max, seconds))
    setTime(a.currentTime)
    if (play) void a.play().catch(() => {})
  }, [duration])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) void a.play().catch(() => {})
    else a.pause()
  }

  const seekFromPointer = (clientX: number) => {
    const r = waveRef.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    seek(((clientX - r.left) / r.width) * duration)
  }

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  return (
    <div className="flex flex-col gap-6">
      {hasAudio && (
        <div className="glass-strong relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-indigo-600/20 blur-3xl" aria-hidden />
          <audio
            ref={audioRef}
            src={recordingUrl!}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration
              if (Number.isFinite(d) && d > 0) setDuration(d)
            }}
          />
          <div className="relative flex items-center gap-4">
            <button
              type="button"
              onClick={toggle}
              aria-label={labels.play}
              aria-pressed={playing}
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/40 outline-none transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-indigo-400/50 active:scale-95"
            >
              {playing ? <Pause className="size-6 fill-current" /> : <Play className="ml-0.5 size-6 fill-current" />}
            </button>

            <div
              ref={waveRef}
              role="slider"
              tabIndex={0}
              aria-label={labels.play}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(time)}
              aria-valuetext={`${formatClock(time)} / ${formatClock(duration)}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                seekFromPointer(e.clientX)
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1) seekFromPointer(e.clientX)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') seek(time + 5)
                else if (e.key === 'ArrowLeft') seek(time - 5)
                else if (e.key === ' ') {
                  e.preventDefault()
                  toggle()
                }
              }}
              className="flex h-14 min-w-0 flex-1 cursor-pointer touch-none items-center gap-[2px] rounded-xl bg-white/5 px-2 outline-none focus-visible:ring-3 focus-visible:ring-indigo-400/50 sm:gap-[3px]"
            >
              {bars.map((h, i) => {
                const done = (i + 0.5) / BARS <= progress
                return (
                  <span
                    key={i}
                    className={cn(
                      'min-w-0 flex-1 rounded-full transition-colors duration-150',
                      done ? 'bg-indigo-400' : 'bg-white/20',
                      playing && done && i >= Math.round(progress * BARS) - 2 && 'app-bar-live'
                    )}
                    style={{ height: `${Math.round(h * 100)}%`, animationDelay: `${(i % 6) * 70}ms` }}
                  />
                )
              })}
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm tabular-nums text-zinc-400">
              <span className="text-white">{formatClock(time)}</span> / {formatClock(duration)}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => seek(time - 10)} aria-label="−10 s" className="flex size-9 items-center justify-center rounded-full text-zinc-300 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-indigo-400/50">
                <RotateCcw className="size-4" />
              </button>
              <button type="button" onClick={() => seek(time + 10)} aria-label="+10 s" className="flex size-9 items-center justify-center rounded-full text-zinc-300 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-indigo-400/50">
                <RotateCw className="size-4" />
              </button>
              <button type="button" onClick={cycleSpeed} aria-label={`${speed}×`} className="ml-1 h-8 min-w-12 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium tabular-nums text-zinc-200 outline-none transition-colors hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-indigo-400/50">
                {speed}×
              </button>
              <a href={recordingUrl!} target="_blank" rel="noopener noreferrer" aria-label={labels.open} className="ml-1 flex size-9 items-center justify-center rounded-full text-zinc-300 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-indigo-400/50">
                <ExternalLink className="size-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{labels.transcript}</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length > 0 ? (
            <div ref={listRef} className="relative flex max-h-[32rem] flex-col gap-1 overflow-y-auto pr-1">
              {messages.map((m, i) => {
                const agent = m.role === 'assistant'
                const on = i === active
                const body = (
                  <>
                    <span className="w-10 shrink-0 pt-0.5 text-left text-xs tabular-nums text-muted-foreground">{formatClock(m.secondsFromStart)}</span>
                    <span className="min-w-0 text-sm leading-relaxed">
                      <span className={cn('font-medium', agent ? 'text-primary' : 'text-muted-foreground')}>{agent ? labels.agent : labels.customer}:</span>{' '}
                      <span className="whitespace-pre-line text-foreground/90">{m.message}</span>
                    </span>
                  </>
                )
                const cls = cn(
                  'flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  on ? 'bg-primary/12 ring-1 ring-primary/25' : hasAudio && 'hover:bg-muted'
                )
                return hasAudio ? (
                  <button key={i} ref={(el) => { lineRefs.current[i] = el }} type="button" onClick={() => seek(m.secondsFromStart, true)} className={cn(cls, 'cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50')}>
                    {body}
                  </button>
                ) : (
                  <div key={i} ref={(el) => { lineRefs.current[i] = el }} className={cls}>
                    {body}
                  </div>
                )
              })}
            </div>
          ) : fallbackTranscript ? (
            <pre className="whitespace-pre-wrap font-sans text-sm">{fallbackTranscript}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">{labels.noTranscript}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
