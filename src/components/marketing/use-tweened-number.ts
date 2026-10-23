'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Číslo, které k nové hodnotě doběhne s měkkým dojezdem (ease-out), místo aby skočilo.
 * Při omezeném pohybu vrací cílovou hodnotu hned.
 */
export function useTweenedNumber(target: number, duration = 550): number {
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  const raf = useRef(0)

  useEffect(() => {
    cancelAnimationFrame(raf.current)
    if (!Number.isFinite(target) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = target
      raf.current = requestAnimationFrame(() => setShown(target))
      return () => cancelAnimationFrame(raf.current)
    }
    const start = performance.now()
    const a = Number.isFinite(from.current) ? from.current : target
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / duration)
      const v = a + (target - a) * (1 - (1 - k) ** 3)
      from.current = v
      setShown(v)
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return shown
}
