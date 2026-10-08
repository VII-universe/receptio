'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { canStorePreferences } from '@/lib/consent'
import { ACCENTS, THEME_STORAGE_KEY, type Accent, type Mode } from './theme-script'

interface ThemeState {
  mode: Mode
  accent: Accent
  resolved: 'light' | 'dark'
  setMode: (m: Mode) => void
  setAccent: (a: Accent) => void
}

const ThemeContext = createContext<ThemeState | null>(null)

function read(): { mode: Mode; accent: Accent } {
  try {
    const s = JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) ?? '{}') as { mode?: string; accent?: string }
    return {
      mode: s.mode === 'light' || s.mode === 'dark' || s.mode === 'system' ? s.mode : 'dark',
      accent: (ACCENTS as readonly string[]).includes(s.accent ?? '') ? (s.accent as Accent) : 'indigo',
    }
  } catch {
    return { mode: 'dark', accent: 'indigo' } // localStorage nemusí být dostupné (soukromý režim)
  }
}

function apply(mode: Mode, accent: Accent) {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const el = document.documentElement
  el.classList.toggle('dark', dark)
  if (accent === 'neutral') el.removeAttribute('data-accent')
  else el.setAttribute('data-accent', accent)
  return dark ? ('dark' as const) : ('light' as const)
}

/** Téma aplikace (světlé / tmavé / podle systému) a akcentová barva; volba se pamatuje v prohlížeči. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('dark')
  const [accent, setAccentState] = useState<Accent>('indigo')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')

  // Po načtení převezmeme uloženou volbu (skript před vykreslením už třídy na <html> nastavil).
  useEffect(() => {
    const s = read()
    setModeState(s.mode)
    setAccentState(s.accent)
    setResolved(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  // Režim "podle systému" sleduje změnu systémového nastavení.
  useEffect(() => {
    if (mode !== 'system') return
    const q = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setResolved(apply('system', accent))
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [mode, accent])

  const persist = useCallback((m: Mode, a: Accent) => {
    // Vzhled je preference: bez souhlasu platí jen do obnovení stránky.
    if (!canStorePreferences()) return
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: m, accent: a }))
    } catch {
      /* volba platí jen do obnovení stránky */
    }
  }, [])

  const setMode = useCallback(
    (m: Mode) => {
      setModeState(m)
      setResolved(apply(m, accent))
      persist(m, accent)
    },
    [accent, persist]
  )
  const setAccent = useCallback(
    (a: Accent) => {
      setAccentState(a)
      setResolved(apply(mode, a))
      persist(mode, a)
    },
    [mode, persist]
  )

  const value = useMemo(() => ({ mode, accent, resolved, setMode, setAccent }), [mode, accent, resolved, setMode, setAccent])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

/**
 * Marketingové stránky jsou vždy tmavé a v indigovém akcentu bez ohledu na volbu uživatele;
 * po odchodu ze stránky se vrátí jeho téma.
 */
export function ForceDark() {
  useEffect(() => {
    const el = document.documentElement
    el.classList.add('dark', 'rc-js')
    el.setAttribute('data-accent', 'indigo')
    return () => {
      el.classList.remove('rc-js')
      const s = read()
      apply(s.mode, s.accent)
    }
  }, [])
  return null
}
