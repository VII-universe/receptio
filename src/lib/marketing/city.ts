// Město v příběhu 24 h a ve finální výzvě: deterministické budovy a okna (stejné při každém
// načtení i na serveru). Souřadnice jsou ve viewBoxu 1440 × 260.

export type City = ReturnType<typeof buildCity>

export function buildCity() {
  let seed = 11
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const buildings: { x: number; w: number; h: number }[] = []
  const windows: { x: number; y: number; on: number; off: number; hue: number; aida?: boolean }[] = []
  let x = -10
  while (x < 1450) {
    const w = 70 + Math.round(rnd() * 90)
    const h = 70 + Math.round(rnd() * 150)
    buildings.push({ x, w, h })
    for (let wx = x + 12; wx + 10 < x + w - 8; wx += 22) {
      for (let wy = 260 - h + 16; wy + 14 < 252; wy += 26) {
        // večer se rozsvítí většina oken (17:15–19:45), v noci postupně zhasínají (22:20–02:00)
        const lit = rnd() < 0.74
        windows.push({ x: wx, y: wy, on: lit ? 17 * 60 + 15 + rnd() * 150 : 99999, off: 22 * 60 + 20 + rnd() * 215, hue: Math.floor(rnd() * 3) })
      }
    }
    x += w + 4 + Math.round(rnd() * 10)
  }
  // Aidino okno: v nejvyšší budově uprostřed, svítí celou dobu
  const mid = buildings.reduce((best, b) => (Math.abs(b.x + b.w / 2 - 760) < Math.abs(best.x + best.w / 2 - 760) ? b : best))
  windows.push({ x: mid.x + Math.round(mid.w / 2) - 5, y: 260 - mid.h + 42, on: 0, off: 99999, hue: 0, aida: true })
  return { buildings, windows }
}
