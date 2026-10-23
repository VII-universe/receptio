'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DAY_END, DAY_START } from './config'
import { CityCanvas } from './city-canvas'
import type { CityController } from './scene'

gsap.registerPlugin(ScrollTrigger)

const clock = (h: number) => {
  const m = Math.floor((h * 60) % (24 * 60))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Náhled scény (M1): bez obsahu webu, scroll posouvá den 08:00 → 02:00 a kameru po trase.
 * ?still=8.5 vykreslí jeden snímek dané hodiny (záložní obrázky), ?perf=1 ukáže měření, ?q=low|high kvalitu.
 */
export function CityDemo() {
  const city = useRef<CityController | null>(null)
  const track = useRef<HTMLDivElement>(null)
  const [hour, setHour] = useState(DAY_START)
  const [still, setStill] = useState<number | null>(null)

  useEffect(() => {
    const s = new URLSearchParams(location.search).get('still')
    if (s) {
      setStill(Number(s))
      setHour(Number(s))
    }
  }, [])

  useEffect(() => {
    if (still !== null || !track.current) return
    const state = { p: 0 }
    const st = ScrollTrigger.create({
      trigger: track.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        gsap.to(state, {
          p: self.progress,
          duration: 0.8,
          ease: 'power2.out',
          overwrite: true,
          onUpdate: () => {
            const h = DAY_START + (DAY_END - DAY_START) * state.p
            city.current?.setHour(h)
            city.current?.setView(state.p)
            setHour((prev) => (Math.abs(prev - h) > 1 / 60 ? h : prev))
          },
        })
      },
    })
    return () => st.kill()
  }, [still])

  return (
    <>
      <CityCanvas hour={hour} still={still !== null} onReady={(c) => (city.current = c)} />
      {still === null && (
        <>
          <div ref={track} className="h-[900svh]" />
          <div className="pointer-events-none fixed bottom-5 right-5 z-10 flex flex-col items-end gap-1 rounded-2xl bg-night/55 px-4 py-3 text-moon backdrop-blur-md">
            <span className="mk-mono text-3xl tabular-nums">{clock(hour)}</span>
            <span className="text-xs text-moon/80">Náhled scény (M1) · scrollem plyne den</span>
          </div>
        </>
      )}
    </>
  )
}
