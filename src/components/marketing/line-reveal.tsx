'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Text nadpisu, který se při vjetí do obrazu odhalí po řádcích zpoza masky.
 * Řádky se změří z vykresleného textu (bez knihovny), po doběhnutí se vrátí obyčejný text,
 * aby se při změně šířky okna zalamoval sám. Bez JS, při omezeném pohybu a u nadpisu,
 * který je už vidět, zůstane text, jak je.
 */
export function LineReveal({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [lines, setLines] = useState<string[] | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let cancelled = false
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // měřit až s načtenými písmy, jinak by řádky odpovídaly náhradnímu písmu
    document.fonts.ready.then(() => {
      if (cancelled || el.getBoundingClientRect().top < window.innerHeight) return
      const measured = el.firstChild instanceof Text ? measureLines(el.firstChild) : null
      if (measured) setLines(measured)
    })
    return () => {
      cancelled = true
    }
  }, [text])

  useEffect(() => {
    const el = ref.current
    if (!lines || !el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        setShown(true)
      },
      { rootMargin: '0px 0px -10% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [lines])

  useEffect(() => {
    if (!shown || !lines) return
    const done = setTimeout(() => setLines(null), 1000 + lines.length * 90)
    return () => clearTimeout(done)
  }, [shown, lines])

  if (!lines) return <span ref={ref}>{text}</span>
  return (
    <span ref={ref} className="mk-reveal" data-shown={shown}>
      <span className="sr-only">{text}</span>
      {lines.map((line, i) => (
        <span key={i} aria-hidden className="mk-reveal-line">
          <span style={{ transitionDelay: `${i * 90}ms` }}>{line}</span>
        </span>
      ))}
    </span>
  )
}

/** Rozdělí text na řádky tak, jak je prohlížeč zalomil. Slovo rozdělené přes dva řádky (dělení) = null. */
function measureLines(node: Text): string[] | null {
  const text = node.data
  const range = document.createRange()
  const lines: string[][] = []
  let lastTop = -Infinity
  let start = 0
  for (const word of text.split(' ')) {
    const end = start + word.length
    if (word) {
      range.setStart(node, start)
      range.setEnd(node, end)
      const rects = range.getClientRects()
      if (!rects.length) return null
      const top = rects[0].top
      if (Array.from(rects).some((r) => Math.abs(r.top - top) > 2)) return null
      if (top - lastTop > 2) lines.push([])
      lines[lines.length - 1].push(word)
      lastTop = top
    }
    start = end + 1
  }
  return lines.map((l) => l.join(' '))
}
