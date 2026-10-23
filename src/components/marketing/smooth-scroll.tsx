'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

// Plynulý scroll veřejného webu (Lenis). Při omezeném pohybu se nezapne vůbec.
// Instance je dostupná přes getLenis() (mobilní menu ji zastaví, příběh 24 h na ni napojí ScrollTrigger).

let instance: Lenis | null = null
const listeners = new Set<(l: Lenis | null) => void>()

export const getLenis = () => instance

/** Zavolá callback hned, pokud Lenis běží, a pak při každé změně (zapnutí/vypnutí). */
export function onLenis(cb: (l: Lenis | null) => void) {
  listeners.add(cb)
  cb(instance)
  return () => {
    listeners.delete(cb)
  }
}

export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lenis: Lenis | null = null

    const enable = () => {
      if (lenis || reduced.matches) return
      lenis = new Lenis({ autoRaf: true, lerp: 0.1, wheelMultiplier: 1 })
      instance = lenis
      listeners.forEach((cb) => cb(lenis))
    }
    const disable = () => {
      lenis?.destroy()
      lenis = null
      instance = null
      listeners.forEach((cb) => cb(null))
    }

    // Odkazy na kotvy na téže stránce (/cs#cenik i #cenik) plynule. Odsazení pod navigaci dává
    // scroll-margin sekcí (Lenis ho respektuje).
    const onClick = (e: MouseEvent) => {
      if (!lenis || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement).closest('a')
      if (!a || !a.hash) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || url.pathname !== location.pathname) return
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)))
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target, { duration: 1.2 })
      history.pushState(null, '', url.hash)
      // fokus pro klávesnici a čtečky, bez dalšího skoku
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }

    const onChange = () => (reduced.matches ? disable() : enable())
    enable()
    reduced.addEventListener('change', onChange)
    document.addEventListener('click', onClick)
    return () => {
      reduced.removeEventListener('change', onChange)
      document.removeEventListener('click', onClick)
      disable()
    }
  }, [])

  return null
}
