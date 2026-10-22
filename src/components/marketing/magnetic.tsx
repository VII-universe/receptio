'use client'

import { useEffect, useRef } from 'react'

/**
 * Magnetický efekt hlavního CTA: tlačítko se jemně natáhne za kurzorem (nejvýš o pár pixelů).
 * Jen pro myš; při dotyku a při omezeném pohybu nic nedělá. Obal je mřížka, takže na mobilu
 * tlačítko dál vyplní šířku sloupce.
 */
export function Magnetic({ children, strength = 0.25, max = 10 }: { children: React.ReactNode; strength?: number; max?: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const move = (e: PointerEvent) => {
      if (reduced.matches) return
      const r = el.getBoundingClientRect()
      const clamp = (v: number) => Math.max(-max, Math.min(max, v))
      const x = clamp((e.clientX - (r.left + r.width / 2)) * strength)
      const y = clamp((e.clientY - (r.top + r.height / 2)) * strength)
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.transition = 'translate 0.15s ease-out'
        el.style.translate = `${x}px ${y}px`
      })
    }
    const leave = () => {
      cancelAnimationFrame(frame)
      el.style.transition = 'translate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
      el.style.translate = '0 0'
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [strength, max])

  return (
    <span ref={ref} className="grid">
      {children}
    </span>
  )
}
