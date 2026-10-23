// Sdílený přístup ke 3D městu: plátno (city-backdrop.tsx) ho sem zaregistruje, příběh 24 h (day-story-motion.tsx)
// si ho tu najde. Bez Reactu, aby se scroll nepropisoval přes rendery.

import type { CityController } from './scene'

let current: CityController | null = null
const listeners = new Set<(c: CityController | null) => void>()

export function setCity(c: CityController | null) {
  current = c
  for (const l of listeners) l(c)
}

export const getCity = () => current

/** Zavolá `cb` hned s aktuálním městem a pak při každé změně (načtení, zrušení). Vrací odhlášení. */
export function onCity(cb: (c: CityController | null) => void) {
  listeners.add(cb)
  cb(current)
  return () => {
    listeners.delete(cb)
  }
}
