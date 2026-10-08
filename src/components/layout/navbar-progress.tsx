'use client'

import { useEffect, useState } from 'react'

/** Tenká linka na spodní hraně navbaru, která se plní podle posunu stránky. */
export function NavbarProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update) // nejvýš jedna aktualizace na snímek
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px]" aria-hidden>
      <div className="h-full origin-left bg-indigo-500" style={{ transform: `scaleX(${progress})` }} />
    </div>
  )
}
