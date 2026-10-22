'use client'

import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'

// Scéna s GSAP se načte až v prohlížeči a jen tam, kde je pohyb povolený.
const loadMotion = () => import('./day-story-motion')
const DayStoryMotion = lazy(loadMotion)

const QUERY = '(prefers-reduced-motion: reduce)'
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/**
 * Přepínač příběhu 24 h: statická časová osa (children, vykreslená na serveru) pro omezený pohyb
 * a bez JavaScriptu, jinak připnutá scéna řízená scrollem. Dokud se scéna načítá, zůstává osa.
 *
 * Scéna se nestaví při načtení stránky (zatížila by hydrataci), ale až když se k ní čtenář blíží
 * shora: výměna osy za scénu pak změní výšku stránky pod obrazem, ne nad ním. Kód se mezitím
 * přednačte v nečinnosti.
 */
export function StoryStage({ children }: { children: React.ReactNode }) {
  const motion = useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(QUERY).matches,
    () => false
  )
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!motion || near || !el) return
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
    idle(() => void loadMotion())
    // Připojit jen, když je osa celá pod obrazem (nebo hned na začátku stránky, kdy se ještě nic nehýbe).
    // Výměna ve chvíli, kdy je osa vidět, by s připnutím scény posunula obsah v obraze.
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        if (e.boundingClientRect.top < window.innerHeight && window.scrollY > 0) return
        io.disconnect()
        setNear(true)
      },
      { rootMargin: '0px 0px 60% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [motion, near])

  if (!motion || !near) return <div ref={ref}>{children}</div>
  return (
    <Suspense fallback={children}>
      <DayStoryMotion />
    </Suspense>
  )
}
