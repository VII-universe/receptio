// Jedno rozhodnutí pro celé 3D město: úvod stránky (city-canvas.tsx) i příběh 24 h (story-stage.tsx)
// ho musí vyhodnotit stejně, jinak by hero běželo ve 3D a příběh spadl do statické osy (nebo naopak).

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

let gl: boolean | null = null
/** WebGL2 (výsledek se pamatuje, testovací kontext se nevytváří opakovaně). */
export function webglOk() {
  if (gl === null) {
    try {
      gl = !!document.createElement('canvas').getContext('webgl2')
    } catch {
      gl = false
    }
  }
  return gl
}

/** Poběží 3D město s pohybem? Jinak statický snímek a statická časová osa. */
export const cityMotion = () => !window.matchMedia(REDUCED_MOTION).matches && webglOk()
