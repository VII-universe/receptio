'use client'

import { lazy, Suspense, useSyncExternalStore } from 'react'

// Scéna s GSAP se načte až v prohlížeči a jen tam, kde je pohyb povolený.
const DayStoryMotion = lazy(() => import('./day-story-motion'))

const QUERY = '(prefers-reduced-motion: reduce)'
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/**
 * Přepínač příběhu 24 h: statická časová osa (children, vykreslená na serveru) pro omezený pohyb
 * a bez JavaScriptu, jinak připnutá scéna řízená scrollem. Dokud se scéna načítá, zůstává osa.
 */
export function StoryStage({ children }: { children: React.ReactNode }) {
  const motion = useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(QUERY).matches,
    () => false
  )
  if (!motion) return <>{children}</>
  return (
    <Suspense fallback={children}>
      <DayStoryMotion />
    </Suspense>
  )
}
