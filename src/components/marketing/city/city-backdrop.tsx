'use client'

import { useEffect, useRef, useState } from 'react'
import { useDemoPlayer } from '../demo-player'
import { setCity } from './bus'
import { DAY_START } from './config'
import { CityCanvas } from './city-canvas'
import type { CityController } from './scene'

/**
 * 3D město pod úvodem stránky a příběhem 24 h: hero stojí nad střechami v 08:00, scroll do příběhu spustí
 * kameru dolů mezi střechy k ordinaci; dál ji vede příběh (day-story-motion.tsx přes bus.ts).
 * Jakmile obrazovku zakryje neprůhledný obsah za příběhem, plátno se pozastaví.
 * Orb nad Aidinou kanceláří reaguje na hlas z přehrávače ukázek. Bez GSAP (úvod stránky ho nepotřebuje):
 * scroll jen nastaví cíl, plynulý dojezd dělá smyčka scény.
 */
export function CityBackdrop() {
  const city = useRef<CityController | null>(null)
  const levels = useDemoPlayer().levels
  const [active, setActive] = useState(true)

  useEffect(() => {
    const stage = document.querySelector<HTMLElement>('[data-story-stage]')
    const end = document.querySelector<HTMLElement>('[data-story-end]')
    if (!stage) return
    let raf = 0
    const update = () => {
      raf = 0
      const top = stage.getBoundingClientRect().top
      const startY = top + window.scrollY
      const p = startY > 0 ? Math.min(1, Math.max(0, window.scrollY / startY)) : 1
      // nad příběhem vede kameru úvod; v příběhu ji převezme jeho časová osa
      if (top > 0) {
        city.current?.setStoryTime(null)
        city.current?.setView(p)
        city.current?.setHour(DAY_START + p * 0.15)
      }
      // za příběhem je zatím neprůhledný obsah: když zakryje celé okno, město se nevykresluje
      setActive(!end || end.getBoundingClientRect().top > 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <CityCanvas
      hour={DAY_START}
      intro
      active={active}
      onReady={(c) => {
        city.current = c
        setCity(c)
        if (!c) return
        c.setVoiceSource(() => (levels.current.playing ? levels.current.amp : 0))
        // poloha podle aktuálního scrollu (stránka mohla být načtená uprostřed)
        window.dispatchEvent(new Event('scroll'))
      }}
    />
  )
}
