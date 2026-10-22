'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { DemoIndustry, DemoSource, DemoTranscript } from '@/lib/marketing/demo'

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

/**
 * Úrovně zvuku pro vykreslování (orb, mini orby). Mění se každý snímek, proto jsou v refu, ne ve stavu:
 * amp = hlasitost, low/high = energie basů a výšek, speaker = 0 volající … 1 Aida (plynule).
 */
export interface AudioLevels {
  amp: number
  low: number
  high: number
  speaker: number
  playing: boolean
}

interface DemoPlayer {
  industry: DemoIndustry
  status: PlayerStatus
  muted: boolean
  time: number
  duration: number
  transcript: DemoTranscript | null
  segment: number
  source: DemoSource | undefined
  levels: React.RefObject<AudioLevels>
  select: (industry: DemoIndustry) => void
  play: (industry?: DemoIndustry) => void
  pause: () => void
  toggle: () => void
  replay: () => void
  seek: (time: number) => void
  setMuted: (muted: boolean) => void
}

const Ctx = createContext<DemoPlayer | null>(null)

export function useDemoPlayer(): DemoPlayer {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDemoPlayer must be used inside DemoPlayerProvider')
  return ctx
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** Jeden přehrávač ukázek pro celou stránku (hero i karty odvětví). Zvuk nikdy nezačne hrát sám. */
export function DemoPlayerProvider({ sources, children }: { sources: DemoSource[]; children: React.ReactNode }) {
  const [industry, setIndustry] = useState<DemoIndustry>('restaurant')
  const [status, setStatus] = useState<PlayerStatus>('idle')
  const [muted, setMutedState] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState<DemoTranscript | null>(null)
  const [segment, setSegment] = useState(-1)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const graph = useRef<{ ctx: AudioContext; analyser: AnalyserNode; gain: GainNode; freq: Uint8Array<ArrayBuffer>; wave: Float32Array<ArrayBuffer> } | null>(null)
  const levels = useRef<AudioLevels>({ amp: 0, low: 0, high: 0, speaker: 1, playing: false })
  const transcripts = useRef(new Map<string, Promise<DemoTranscript | null>>())
  const current = useRef<{ industry: DemoIndustry; transcript: DemoTranscript | null }>({ industry: 'restaurant', transcript: null })
  const frame = useRef(0)
  const lastTimeUpdate = useRef(0)
  const mutedRef = useRef(false)

  const sourceFor = useCallback((id: DemoIndustry) => sources.find((s) => s.industry === id), [sources])

  const loadTranscript = useCallback((src: DemoSource) => {
    let p = transcripts.current.get(src.transcript)
    if (!p) {
      p = fetch(src.transcript)
        .then((r) => (r.ok ? (r.json() as Promise<DemoTranscript>) : null))
        .catch(() => null)
      transcripts.current.set(src.transcript, p)
    }
    return p
  }, [])

  // Smyčka během přehrávání: úrovně zvuku pro orb, čas a aktuální replika.
  const tick = useCallback(() => {
    const audio = audioRef.current
    const g = graph.current
    const lv = levels.current
    if (!audio) return
    if (g) {
      g.analyser.getFloatTimeDomainData(g.wave)
      let sum = 0
      for (let i = 0; i < g.wave.length; i++) sum += g.wave[i] * g.wave[i]
      const rms = Math.sqrt(sum / g.wave.length)
      g.analyser.getByteFrequencyData(g.freq)
      const hz = g.ctx.sampleRate / 2 / g.freq.length
      const band = (from: number, to: number) => {
        let s = 0
        const a = Math.floor(from / hz)
        const b = Math.max(a + 1, Math.floor(to / hz))
        for (let i = a; i < b; i++) s += g.freq[i]
        return s / (b - a) / 255
      }
      const amp = Math.min(1, rms * 4.5)
      // rychlý náběh, pomalejší doznívání: orb „mluví“, ale necuká
      lv.amp = lerp(lv.amp, amp, amp > lv.amp ? 0.45 : 0.12)
      lv.low = lerp(lv.low, band(80, 400), 0.25)
      lv.high = lerp(lv.high, band(1500, 4500), 0.25)
    }
    const t = audio.currentTime
    const tr = current.current.transcript
    if (tr) {
      const idx = tr.segments.findIndex((s) => t >= s.start - 0.05 && t <= s.end + 0.35)
      if (idx >= 0) lv.speaker = lerp(lv.speaker, tr.segments[idx].speaker === 'aida' ? 1 : 0, 0.08)
      setSegment((prev) => (prev === idx ? prev : idx))
    }
    const now = performance.now()
    if (now - lastTimeUpdate.current > 100) {
      lastTimeUpdate.current = now
      setTime(t)
    }
    frame.current = requestAnimationFrame(tick)
  }, [])

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(frame.current)
    frame.current = 0
    const lv = levels.current
    lv.playing = false
    // úrovně doběhnou k nule plynule ve vykreslovací smyčce orbu
  }, [])

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current
    const audio = new Audio()
    audio.preload = 'none'
    audio.crossOrigin = 'anonymous'
    audio.addEventListener('playing', () => {
      setStatus('playing')
      levels.current.playing = true
      if (!frame.current) frame.current = requestAnimationFrame(tick)
    })
    // Události po odpojení nahrávky (přepnutí oboru v klidu) ignorujeme, stav už nastavil select().
    const detached = () => !audio.getAttribute('src')
    audio.addEventListener('pause', () => {
      stopLoop()
      if (detached()) return
      if (!audio.ended) setStatus((s) => (s === 'loading' ? s : 'paused'))
    })
    audio.addEventListener('ended', () => {
      setStatus('ended')
      setSegment(-1)
      stopLoop()
    })
    audio.addEventListener('waiting', () => setStatus('loading'))
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration || 0))
    audio.addEventListener('error', () => {
      stopLoop()
      if (!detached()) setStatus('error')
    })
    audioRef.current = audio
    return audio
  }, [stopLoop, tick])

  // Web Audio graf až po kliknutí (prohlížeče jinak AudioContext nespustí): zdroj → analyzátor → hlasitost → výstup.
  const ensureGraph = useCallback((audio: HTMLAudioElement) => {
    if (graph.current) return graph.current
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    try {
      const ctx = new AC()
      const src = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.55
      const gain = ctx.createGain()
      gain.gain.value = mutedRef.current ? 0 : 1
      src.connect(analyser)
      analyser.connect(gain)
      gain.connect(ctx.destination)
      graph.current = { ctx, analyser, gain, freq: new Uint8Array(analyser.frequencyBinCount), wave: new Float32Array(analyser.fftSize) }
    } catch {
      return null
    }
    return graph.current
  }, [])

  const start = useCallback(
    async (id: DemoIndustry, from = 0) => {
      const src = sourceFor(id)
      if (!src) return
      const audio = ensureAudio()
      const g = ensureGraph(audio)
      if (g && g.ctx.state === 'suspended') void g.ctx.resume()
      const switching = current.current.industry !== id || !audio.src
      current.current.industry = id
      setIndustry(id)
      if (switching) {
        const playable = src.sources.find((s) => audio.canPlayType(s.type) !== '') ?? src.sources[src.sources.length - 1]
        audio.src = playable.src
        current.current.transcript = null
        setTranscript(null)
        setSegment(-1)
        setTime(0)
        setDuration(0)
        void loadTranscript(src).then((tr) => {
          if (current.current.industry !== id) return
          current.current.transcript = tr
          setTranscript(tr)
          if (tr && !audio.duration) setDuration(tr.duration)
        })
      }
      if (from >= 0 && (switching || audio.ended)) audio.currentTime = from
      setStatus('loading')
      try {
        await audio.play()
      } catch {
        setStatus('error')
      }
    },
    [ensureAudio, ensureGraph, loadTranscript, sourceFor]
  )

  const pause = useCallback(() => audioRef.current?.pause(), [])

  const play = useCallback(
    (id?: DemoIndustry) => {
      const target = id ?? current.current.industry
      const audio = audioRef.current
      if (audio && target === current.current.industry && audio.src && !audio.ended && audio.paused) {
        void start(target, -1)
        return
      }
      void start(target)
    },
    [start]
  )

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (audio && !audio.paused) pause()
    else play()
  }, [pause, play])

  const replay = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.src) audio.currentTime = 0
    void start(current.current.industry, 0)
  }, [start])

  const select = useCallback(
    (id: DemoIndustry) => {
      const audio = audioRef.current
      const wasPlaying = !!audio && !audio.paused
      if (wasPlaying) {
        void start(id)
        return
      }
      if (audio) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      }
      current.current = { industry: id, transcript: null }
      setIndustry(id)
      setStatus('idle')
      setTranscript(null)
      setSegment(-1)
      setTime(0)
      setDuration(0)
    },
    [start]
  )

  const seek = useCallback((t: number) => {
    const audio = audioRef.current
    if (!audio || !audio.src) return
    audio.currentTime = t
    setTime(t)
  }, [])

  const setMuted = useCallback((m: boolean) => {
    mutedRef.current = m
    setMutedState(m)
    const g = graph.current
    if (g) g.gain.gain.setTargetAtTime(m ? 0 : 1, g.ctx.currentTime, 0.02)
    else if (audioRef.current) audioRef.current.muted = m
  }, [])

  // Úklid při odchodu ze stránky.
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      audioRef.current?.pause()
      void graph.current?.ctx.close()
    },
    []
  )

  const value = useMemo<DemoPlayer>(
    () => ({
      industry,
      status,
      muted,
      time,
      duration,
      transcript,
      segment,
      source: sourceFor(industry),
      levels,
      select,
      play,
      pause,
      toggle,
      replay,
      seek,
      setMuted,
    }),
    [industry, status, muted, time, duration, transcript, segment, sourceFor, select, play, pause, toggle, replay, seek, setMuted]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
