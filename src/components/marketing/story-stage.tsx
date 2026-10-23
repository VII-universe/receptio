'use client'

import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cityMotion, REDUCED_MOTION } from './city/support'

// Scéna s GSAP se načte až v prohlížeči a jen tam, kde poběží i 3D město.
const loadMotion = () => import('./day-story-motion')
const DayStoryMotion = lazy(loadMotion)

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/**
 * Přepínač příběhu 24 h: statická časová osa (children, vykreslená na serveru) pro omezený pohyb, prohlížeče
 * bez WebGL a bez JavaScriptu, jinak připnutá vrstva nad 3D městem řízená scrollem. O tom rozhoduje stejná
 * funkce jako u úvodu stránky (city/support.ts), takže hero i příběh jsou vždy ve stejném režimu.
 *
 * Scéna se nestaví hned při hydrataci (zatížila by ji), ale jakmile je čtenář u příběhu, nejpozději však
 * v nečinnosti po načtení. Připojí se vždy, i když je osa zrovna v obraze (rychlý scroll, kotva, obnovená
 * pozice po reloadu): statická osa je jen záloha, ne stav, ve kterém by příběh mohl uvíznout.
 */
export function StoryStage({ children }: { children: React.ReactNode }) {
  const motion = useSyncExternalStore(subscribe, cityMotion, () => false)
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!motion || ready || !el) return
    const mount = () => setReady(true)
    void loadMotion()
    // u příběhu (nebo těsně nad ním): hned
    const io = new IntersectionObserver(([e]) => e.isIntersecting && mount(), { rootMargin: '0px 0px 60% 0px' })
    io.observe(el)
    // jinde na stránce: v nečinnosti, nejpozději do 2,5 s
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const handle = idle(mount, { timeout: 2500 })
    return () => {
      io.disconnect()
      cancel(handle as number)
    }
  }, [motion, ready])

  if (!motion || !ready) return <div ref={ref}>{children}</div>
  return (
    <Suspense fallback={children}>
      <DayStoryMotion />
    </Suspense>
  )
}
