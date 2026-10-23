'use client'

import { useEffect, useRef, useState } from 'react'
import type { CityController, CityStats, Quality } from './scene'

/** Záložní snímky stavů dne (AVIF) pro omezený pohyb, prohlížeče bez WebGL a pomalé načtení scény. */
export const STILLS = [
  { h: 8.5, key: '0830' },
  { h: 12.5, key: '1230' },
  { h: 16.5, key: '1630' },
  { h: 18.25, key: '1815' },
  { h: 21, key: '2100' },
  { h: 25.5, key: '0130' },
] as const
const stillFor = (h: number) => STILLS.reduce((best, s) => (Math.abs(s.h - h) < Math.abs(best.h - h) ? s : best))

/** Když se scéna do té doby nenačte, ukáže se místo prázdné oblohy hotový snímek města (a úvod se přeskočí). */
const STILL_AFTER_MS = 2500

function detectQuality(): Quality {
  const q = new URLSearchParams(location.search).get('q')
  if (q === 'low' || q === 'high') return q
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = Math.min(window.innerWidth, window.innerHeight) < 700
  const cores = navigator.hardwareConcurrency ?? 4
  return coarse || small || cores <= 4 ? 'low' : 'high'
}

function webglOk() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

/**
 * Plátno Aidina města přes celou obrazovku pod obsahem. Scéna (Three.js) se načte v nečinnosti po vykreslení
 * stránky. S `intro` je do té doby vidět jen ranní obloha a město pak vyroste ze země; při omezeném pohybu,
 * bez WebGL nebo při pomalém načtení je vidět statický snímek stejného okamžiku dne.
 * Ovládání (hodina, kamera) dostane rodič přes `onReady`, aby se scroll nepropisoval přes React.
 * `active={false}` pozastaví vykreslování (scénu zrovna zakrývá neprůhledný obsah).
 */
export function CityCanvas({
  hour,
  onReady,
  still,
  intro = false,
  active = true,
}: {
  hour: number
  onReady?: (c: CityController | null) => void
  still?: boolean
  intro?: boolean
  active?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cityRef = useRef<CityController | null>(null)
  const [live, setLive] = useState(false)
  const [showStill, setShowStill] = useState(!intro)
  const [stats, setStats] = useState<CityStats | null>(null)
  const [perf, setPerf] = useState(false)
  const onReadyRef = useRef(onReady)
  const hourRef = useRef(hour)
  const activeRef = useRef(active)
  const showStillRef = useRef(showStill)
  useEffect(() => {
    onReadyRef.current = onReady
    hourRef.current = hour
    activeRef.current = active
    showStillRef.current = showStill
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const showPerf = new URLSearchParams(location.search).get('perf') === '1'
    setPerf(showPerf)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if ((reduced && !still) || !webglOk()) {
      setShowStill(true)
      onReadyRef.current?.(null)
      return
    }
    let cancelled = false
    let statsTimer: ReturnType<typeof setInterval> | undefined
    const stillTimer = intro ? setTimeout(() => !cancelled && setShowStill(true), STILL_AFTER_MS) : undefined
    const size = () => cityRef.current?.setSize(window.innerWidth, window.innerHeight)
    const vis = () => (document.hidden ? cityRef.current?.stop() : !still && activeRef.current && cityRef.current?.start())
    const move = (e: PointerEvent) => cityRef.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)

    const boot = async () => {
      const { createCity } = await import('./scene')
      if (cancelled) return
      const city = await createCity(canvas, { quality: detectQuality(), dpr: window.devicePixelRatio || 1, portrait: window.innerWidth < window.innerHeight })
      if (cancelled) {
        city.dispose()
        return
      }
      cityRef.current = city
      city.setHour(hourRef.current)
      size()
      clearTimeout(stillTimer)
      // úvod jen tehdy, když ještě není vidět hotový snímek (jinak by město zmizelo a znovu vyrostlo)
      if (intro && !showStillRef.current) city.playIntro()
      if (still) {
        city.renderOnce()
        ;(window as unknown as { __cityReady?: boolean }).__cityReady = true
      } else if (activeRef.current) city.start()
      requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && setLive(true)))
      onReadyRef.current?.(city)
      window.addEventListener('resize', size)
      document.addEventListener('visibilitychange', vis)
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) window.addEventListener('pointermove', move)
      if (showPerf) statsTimer = setInterval(() => cityRef.current && setStats(cityRef.current.stats()), 500)
    }
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200))
    const handle = idle(() => void boot(), { timeout: 1200 })

    return () => {
      cancelled = true
      if (window.cancelIdleCallback && typeof handle === 'number') window.cancelIdleCallback(handle)
      clearTimeout(stillTimer)
      clearInterval(statsTimer)
      window.removeEventListener('resize', size)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pointermove', move)
      onReadyRef.current?.(null)
      cityRef.current?.dispose()
      cityRef.current = null
    }
  }, [still, intro])

  // pauza, když scénu zakrývá obsah
  useEffect(() => {
    const city = cityRef.current
    if (!city || still) return
    if (active && !document.hidden) city.start()
    else city.stop()
  }, [active, still])

  const fallback = stillFor(hour)
  // stahují se jen snímky, které už byly potřeba (všechny jsou v obraze, takže loading="lazy" by nepomohl)
  const [seen, setSeen] = useState<string[]>(() => (intro ? [] : [fallback.key]))
  useEffect(() => {
    if (showStill && !live) setSeen((prev) => (prev.includes(fallback.key) ? prev : [...prev, fallback.key]))
  }, [fallback.key, live, showStill])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[linear-gradient(180deg,#9ec3e6_0%,#d9e3ea_32%,#fde9d2_58%,#f4e3cc_100%)]">
      {STILLS.filter((s) => seen.includes(s.key)).map((s) => (
        <picture key={s.key}>
          <source media="(orientation: portrait)" srcSet={`/city/still-${s.key}-portrait.avif`} type="image/avif" />
          <img
            src={`/city/still-${s.key}.avif`}
            alt=""
            decoding="async"
            className="absolute inset-0 size-full object-cover transition-opacity duration-700"
            style={{ opacity: !live && showStill && s.key === fallback.key ? 1 : 0 }}
          />
        </picture>
      ))}
      <canvas ref={canvasRef} className="absolute inset-0 size-full transition-opacity duration-500" style={{ opacity: live ? 1 : 0 }} />
      {perf && (
        <div className="pointer-events-auto fixed left-3 top-3 z-50 rounded-lg bg-black/75 px-3 py-2 font-mono text-[11px] leading-relaxed text-white">
          {stats ? (
            <>
              <div>
                {stats.fps.toFixed(0)} fps · nejhorší {stats.worst.toFixed(0)} ms
              </div>
              <div>
                {stats.calls} draw calls · {(stats.tris / 1000).toFixed(0)}k trojúhelníků
              </div>
              <div>
                {stats.quality} · DPR {stats.pixelRatio.toFixed(2)} · měřítko {stats.scale.toFixed(2)}
              </div>
              <div className="max-w-[16rem] truncate opacity-70">{stats.renderer}</div>
            </>
          ) : (
            <div>{live ? 'měřím…' : 'načítám scénu…'}</div>
          )}
        </div>
      )}
    </div>
  )
}
