'use client'

import { useSyncExternalStore } from 'react'
import { canStorePreferences } from '@/lib/consent'

// Mikrozvuky veřejného webu (zvonek příchozího hovoru, cinknutí notifikace), syntetizované přes
// Web Audio, žádné soubory. Ve výchozím stavu vypnuté. Volba se uloží do localStorage jen se
// souhlasem s preferencemi (cookie lišta), jinak platí do zavření stránky.

export type MicroSound = 'ring' | 'ding'

const KEY = 'receptio-sounds'
let enabled = false
let loaded = false
let ctx: AudioContext | null = null
let master: GainNode | null = null
let lastPlay = 0
const listeners = new Set<() => void>()

function load() {
  if (loaded) return
  loaded = true
  try {
    enabled = window.localStorage.getItem(KEY) === '1'
  } catch {
    enabled = false
  }
  // zapnuto z minula: AudioContext smí vzniknout až po prvním gestu uživatele
  if (enabled) {
    const wake = () => void context()?.resume()
    window.addEventListener('pointerdown', wake, { once: true })
    window.addEventListener('keydown', wake, { once: true })
  }
}

function context() {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0.14
  master.connect(ctx.destination)
  return ctx
}

export function setSoundsEnabled(on: boolean) {
  load()
  enabled = on
  // kliknutí na přepínač je uživatelské gesto: tady smí AudioContext vzniknout / probudit se
  if (on) void context()?.resume()
  try {
    if (canStorePreferences()) window.localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // úložiště nemusí být dostupné
  }
  listeners.forEach((l) => l())
}

export function useSoundsEnabled(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => {
      load()
      return enabled
    },
    () => false
  )
}

/** Krátký tón s rychlým náběhem a exponenciálním doznívání. */
function tone(c: AudioContext, freq: number, at: number, length: number, gain: number) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, at)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(g)
  g.connect(master!)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

export function playSound(name: MicroSound) {
  if (!enabled || document.hidden) return
  const now = performance.now()
  if (now - lastPlay < 250) return
  lastPlay = now
  const c = context()
  if (!c || c.state !== 'running') {
    void c?.resume()
    return
  }
  const t = c.currentTime + 0.01
  if (name === 'ring') {
    // jemné dvojité zazvonění (dva tóny, dvakrát)
    for (const off of [0, 0.32]) {
      tone(c, 1318.5, t + off, 0.22, 0.5)
      tone(c, 987.8, t + off + 0.09, 0.26, 0.45)
    }
  } else {
    // cinknutí notifikace
    tone(c, 1568, t, 0.5, 0.45)
    tone(c, 2093, t + 0.07, 0.6, 0.3)
  }
}
