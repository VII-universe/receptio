'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** Plynulé odkrytí prvku při doscrollování (bez JS nebo s omezeným pohybem zůstane vše viditelné). */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'li' | 'section'
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.setAttribute('data-in', '')
          io.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const Comp = Tag as 'div'
  return (
    <Comp ref={ref} className={cn('rc-reveal', className)} style={{ '--rc-delay': `${delay}ms` } as React.CSSProperties}>
      {children}
    </Comp>
  )
}

/** Počítá od nuly k číslu na začátku textu (např. "98 %", "24/7"), jakmile je vidět. */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const match = /^(\d+)(.*)$/.exec(value)
  const target = match ? Number(match[1]) : null
  const [n, setN] = useState(target)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (target === null || target > 1000 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    setN(0)
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400)
        setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [target])

  if (!match) return <span className={className}>{value}</span>
  return (
    <span ref={ref} className={cn('tabular-nums', className)} aria-label={value}>
      {n}
      {match[2]}
    </span>
  )
}

/** Skleněná karta se světelným "reflektorem" sledujícím kurzor. */
export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        ref.current!.style.setProperty('--mx', `${e.clientX - r.left}px`)
        ref.current!.style.setProperty('--my', `${e.clientY - r.top}px`)
      }}
      className={cn('glass group relative overflow-hidden rounded-2xl transition-transform duration-500 hover:-translate-y-1', className)}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(360px circle at var(--mx,50%) var(--my,0%), rgb(129 140 248 / 0.16), transparent 60%)' }}
        aria-hidden
      />
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  )
}
