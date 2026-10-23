// Procedurální Aidino město jako data (bez Three.js): seznamy instancí podle tvaru, okna, kontaktní stíny,
// lampy a komíny. Pevný seed, takže město je pokaždé stejné. Scéna (scene.ts) z toho postaví instancované meshe.

import { FLOOR, GRID, HERO, PAL, PARKS, type HeroId } from './config'

/** Instance jednotkového tvaru: poloha, rozměr, natočení (ry kolem svislé osy, rx sklon) a barva. */
export interface Inst {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  ry: number
  rx: number
  c: string
}
export type Shape = 'rbox' | 'box' | 'gable' | 'hip' | 'cyl' | 'cone' | 'leaf' | 'torus'

/**
 * Okno: střed, natočení normály, rozměr, kdy svítí (hodiny 0–28), druh (0 byt, 1 výloha, 2 Aida),
 * teplota světla (0 teplá kuchyň, 1 neutrální pokoj, 2 modrá televize) a jas (tlumený … jasný).
 */
export interface Win {
  x: number
  y: number
  z: number
  ry: number
  w: number
  h: number
  on: number
  off: number
  kind: 0 | 1 | 2
  tint: 0 | 1 | 2
  level: number
  seed: number
}

export interface CityData {
  shapes: Record<Shape, Inst[]>
  windows: Win[]
  contacts: { x: number; z: number; w: number; d: number }[]
  lamps: [number, number, number][]
  chimneys: [number, number, number][]
  aida: { window: [number, number, number]; orb: [number, number, number]; roof: number }
  heroes: Record<HeroId, [number, number]>
  size: number
}

export function buildCity(quality: 'high' | 'low'): CityData {
  let seed = 11
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]
  const detail = quality === 'high'

  const shapes: Record<Shape, Inst[]> = { rbox: [], box: [], gable: [], hip: [], cyl: [], cone: [], leaf: [], torus: [] }
  const windows: Win[] = []
  const contacts: CityData['contacts'] = []
  const lamps: CityData['lamps'] = []
  const chimneys: CityData['chimneys'] = []
  const heroes = {} as CityData['heroes']
  let aida: CityData['aida'] = { window: [0, 0, 0], orb: [0, 0, 0], roof: 0 }

  const put = (shape: Shape, x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, ry = 0, rx = 0) =>
    shapes[shape].push({ x, y, z, sx, sy, sz, ry, rx, c })

  // okna: asi třetina zůstane tmavá, ostatní se rozsvítí 17:15–19:45; zhasínají plynule od 20:45 do 02:00
  // (víc později večer), pár nočních sov svítí do rána. Jas a teplota se liší okno od okna.
  const addWindow = (x: number, y: number, z: number, ry: number, w: number, h: number, opts: Partial<Win> = {}) => {
    const r = rnd()
    const t = rnd()
    windows.push({
      x, y, z, ry, w, h,
      on: opts.on ?? (rnd() < 0.68 ? 17.25 + rnd() * 2.5 : 99),
      off: opts.off ?? (rnd() < 0.025 ? 30 : 20.75 + Math.pow(rnd(), 0.85) * 5.25),
      kind: opts.kind ?? 0,
      tint: opts.tint ?? (t < 0.3 ? 0 : t < 0.86 ? 1 : 2),
      level: opts.level ?? (r < 0.45 ? 0.38 : r < 0.86 ? 0.68 : 1),
      seed: rnd(),
    })
  }

  // ───────── Fasáda: okna, parapety, okenice, balkony ─────────
  type Style = 'std' | 'tall' | 'square' | 'pair'
  const WIN: Record<Style, [number, number]> = { std: [0.52, 0.78], tall: [0.46, 1.0], square: [0.66, 0.62], pair: [0.3, 0.78] }
  function facade(cx: number, cz: number, w: number, d: number, floors: number, opts: { from?: number; shutters?: boolean; balconies?: boolean; style?: Style; dark?: boolean } = {}) {
    const faces = [
      { len: w, nx: 0, nz: 1, at: (t: number) => [cx + t, cz + d / 2] },
      { len: w, nx: 0, nz: -1, at: (t: number) => [cx - t, cz - d / 2] },
      { len: d, nx: 1, nz: 0, at: (t: number) => [cx + w / 2, cz - t] },
      { len: d, nx: -1, nz: 0, at: (t: number) => [cx - w / 2, cz + t] },
    ]
    const style = opts.style ?? 'std'
    const [ww, wh] = WIN[style]
    const shutter = opts.shutters ? pick(PAL.shutter) : null
    const dark: Partial<Win> = opts.dark ? { on: 99 } : {}
    for (const f of faces) {
      const cols = Math.max(1, Math.floor((f.len - 0.8) / 1.2))
      const step = f.len / cols
      const ry = Math.atan2(f.nx, f.nz)
      const latX = f.nz
      const latZ = -f.nx
      for (let fl = opts.from ?? 0; fl < floors; fl++) {
        for (let c = 0; c < cols; c++) {
          const [bx, bz] = f.at(-f.len / 2 + step * (c + 0.5))
          const y = 0.44 + fl * FLOOR + FLOOR * 0.55
          const px = bx + f.nx * 0.025
          const pz = bz + f.nz * 0.025
          if (style === 'pair') {
            addWindow(px + latX * 0.19, y, pz + latZ * 0.19, ry, ww, wh, dark)
            addWindow(px - latX * 0.19, y, pz - latZ * 0.19, ry, ww, wh, dark)
          } else addWindow(px, y, pz, ry, ww, wh, dark)
          if (!detail) continue
          put('box', bx + f.nx * 0.07, y - wh / 2 - 0.05, bz + f.nz * 0.07, ww + 0.16 + (style === 'pair' ? 0.4 : 0), 0.07, 0.14, PAL.trim, ry)
          if (shutter)
            for (const side of [-1, 1]) put('box', bx + f.nx * 0.04 + latX * side * 0.4, y, bz + f.nz * 0.04 + latZ * side * 0.4, 0.2, 0.8, 0.05, shutter, ry)
          if (opts.balconies && fl > 0 && fl % 2 === 0 && f.nz > 0.5 && c % 2 === 0) {
            put('box', bx, y - 0.55, bz + 0.35, 1.0, 0.08, 0.6, PAL.trim, ry)
            put('box', bx, y - 0.33, bz + 0.63, 1.0, 0.4, 0.04, '#d8cbb6', ry)
          }
        }
      }
    }
  }

  function storefront(cx: number, z: number, w: number, awning: [string, string], kind: 0 | 1 = 1) {
    put('rbox', cx, 1.39, z + 0.04, w - 0.8, 1.35, 0.1, '#3f4b60')
    addWindow(cx, 1.39, z + 0.1, 0, w - 1.0, 1.15, { kind, on: 16.8, off: 22, tint: 1, level: 1 })
    const n = Math.max(4, Math.round(w / 0.9))
    for (let i = 0; i < n; i++) put('box', cx - (w - 0.4) / 2 + ((w - 0.4) / n) * (i + 0.5), 2.54, z + 0.55, (w - 0.4) / n, 0.07, 1.2, awning[i % 2], 0, 0.38)
  }

  function tree(x: number, z: number, s: number, y = 0.25) {
    put('cyl', x, y + 0.55 * s, z, 0.24 * s, 1.1 * s, 0.24 * s, PAL.trunk)
    put('leaf', x, y + 1.55 * s, z, 1.7 * s, 1.7 * s, 1.7 * s, pick(PAL.tree), rnd() * 3)
    if (rnd() < 0.55) put('leaf', x + 0.35 * s, y + 2.05 * s, z - 0.2 * s, 1.1 * s, 1.1 * s, 1.1 * s, pick(PAL.tree), rnd() * 3)
    contacts.push({ x, z, w: 1.4 * s, d: 1.4 * s })
  }

  function car(x: number, z: number, ry: number, color: string, y = 0) {
    const c = Math.cos(ry)
    const s = Math.sin(ry)
    put('rbox', x, y + 0.42, z, 2.1, 0.6, 1.0, color, ry)
    put('rbox', x - 0.1 * c, y + 0.86, z + 0.1 * s, 1.15, 0.48, 0.9, color === '#2f3a4f' ? '#3d4a63' : '#f7f0e4', ry)
    put('rbox', x - 0.1 * c, y + 0.9, z + 0.1 * s, 1.17, 0.26, 0.92, '#55657d', ry)
    if (detail)
      for (const [a, b] of [[-0.65, -0.5], [0.65, -0.5], [-0.65, 0.5], [0.65, 0.5]])
        put('cyl', x + a * c + b * s, y + 0.24, z - a * s + b * c, 0.44, 0.16, 0.44, '#2b2f3a', ry, Math.PI / 2)
    contacts.push({ x, z, w: Math.abs(c) * 2.3 + Math.abs(s) * 1.1, d: Math.abs(s) * 2.3 + Math.abs(c) * 1.1 })
  }

  // ───────── Běžné domy ─────────
  function building(cx: number, cz: number, w: number, d: number, floors: number) {
    const h = floors * FLOOR + 0.3
    contacts.push({ x: cx, z: cz, w, d })
    // tři barvy fasád, meruňková nejméně (ať město nezoranžoví)
    const fr = rnd()
    put('rbox', cx, h / 2 + 0.24, cz, w, h, d, PAL.facade[fr < 0.48 ? 0 : fr < 0.82 ? 1 : 2])
    put('rbox', cx, 0.4, cz, w + 0.14, 0.32, d + 0.14, PAL.plinth)
    const low = floors <= 3
    const style = low ? (rnd() < 0.55 ? 'gable' : rnd() < 0.5 ? 'hip' : 'flat') : rnd() < 0.15 ? 'hip' : 'flat'
    const top = h + 0.24
    if (style !== 'flat') {
      const roofH = Math.min(w, d) * (style === 'gable' ? 0.42 : 0.38)
      const roofCol = rnd() < 0.12 ? pick(PAL.slate) : pick(PAL.roof)
      put('rbox', cx, top, cz, w + 0.25, 0.14, d + 0.25, PAL.trim)
      if (style === 'gable') {
        const long = w >= d
        put('gable', cx, top + 0.05, cz, long ? w + 0.3 : d + 0.3, roofH, long ? d + 0.4 : w + 0.4, roofCol, long ? 0 : Math.PI / 2)
      } else put('hip', cx, top + 0.05, cz, w + 0.35, roofH, d + 0.35, roofCol)
      const chx = cx + (rnd() - 0.5) * w * 0.5
      const chz = cz + (rnd() - 0.5) * d * 0.3
      put('rbox', chx, top + roofH * 0.6, chz, 0.45, 1.2, 0.45, '#d8c3a6')
      put('rbox', chx, top + roofH * 0.6 + 0.62, chz, 0.55, 0.1, 0.55, '#bfae97')
      chimneys.push([chx, top + roofH * 0.6 + 0.7, chz])
    } else {
      put('rbox', cx, top + 0.1, cz, w + 0.1, 0.4, d + 0.1, PAL.trim)
      put('box', cx, top + 0.22, cz, w - 0.3, 0.06, d - 0.3, '#d6c4aa')
      const n = 1 + Math.floor(rnd() * 3)
      for (let i = 0; i < n; i++) put('rbox', cx + (rnd() - 0.5) * (w - 1.5), top + 0.5, cz + (rnd() - 0.5) * (d - 1.5), 0.85, 0.55, 0.65, '#e8e1d6')
      if (rnd() < 0.3) {
        const x = cx + w * 0.22
        const z = cz - d * 0.2
        put('cyl', x, top + 1.3, z, 1.1, 1.0, 1.1, PAL.wood)
        put('cone', x, top + 2.02, z, 1.32, 0.45, 1.32, pick(PAL.roof))
        if (detail) for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put('box', x + a * 0.35, top + 0.55, z + b * 0.35, 0.08, 0.6, 0.08, PAL.wood)
      }
      if (rnd() < 0.25) {
        // komín technického zázemí (kouří večer jako ostatní)
        put('rbox', cx - w * 0.3, top + 0.8, cz + d * 0.3, 0.5, 1.2, 0.5, '#d8c3a6')
        chimneys.push([cx - w * 0.3, top + 1.45, cz + d * 0.3])
      }
      if (detail && rnd() < 0.3) put('leaf', cx - w * 0.25, top + 0.7, cz + d * 0.25, 1, 1, 1, pick(PAL.tree))
    }
    const shop = rnd() < 0.3 && floors >= 2
    if (shop) storefront(cx, cz + d / 2, w, pick(PAL.awning))
    else {
      put('rbox', cx + (rnd() - 0.5) * (w - 2), 0.98, cz + d / 2 + 0.04, 0.95, 1.45, 0.12, pick(PAL.door))
      if (detail) put('box', cx, 0.31, cz + d / 2 + 0.25, 1.3, 0.12, 0.5, '#e2d3bc')
      for (const side of [-1, 1]) addWindow(cx + side * (w / 2 - 0.9), 0.44 + FLOOR * 0.55, cz + d / 2 + 0.025, 0, 0.55, 0.7)
    }
    facade(cx, cz, w, d, floors, { from: 1, shutters: low && rnd() < 0.7, balconies: !low, style: pick(['std', 'std', 'tall', 'square', 'pair'] as const) })
  }

  // ───────── Hrdinské budovy ─────────
  function shopHouse(cx: number, cz: number, floors: number, color: string, awning: [string, string] | null) {
    const w = 8.6
    const d = 6.6
    const h = floors * FLOOR + 0.6
    const z0 = cz - 1.2
    contacts.push({ x: cx, z: z0, w, d })
    put('rbox', cx, h / 2 + 0.24, z0, w, h, d, color)
    put('rbox', cx, 0.4, z0, w + 0.14, 0.32, d + 0.14, PAL.plinth)
    put('rbox', cx, h + 0.24, z0, w + 0.25, 0.14, d + 0.25, PAL.trim)
    put('gable', cx, h + 0.3, z0, w + 0.4, 2.0, d + 0.5, pick(PAL.roof))
    put('rbox', cx + 2.2, h + 1.5, z0, 0.45, 1.2, 0.45, '#d8c3a6')
    chimneys.push([cx + 2.2, h + 2.15, z0])
    const front = z0 + d / 2
    if (awning) storefront(cx, front, w, awning)
    for (let fl = 1; fl < floors; fl++)
      for (let c = 0; c < 5; c++) {
        const x = cx - w / 2 + 1.1 + c * ((w - 2.2) / 4)
        const y = fl * FLOOR + 1.04 + FLOOR * 0.45
        addWindow(x, y, front + 0.03, 0, 0.6, 0.85)
        if (detail) put('box', x, y - 0.48, front + 0.07, 0.74, 0.07, 0.14, PAL.trim)
      }
    return front
  }

  const HERO_BUILD: Record<HeroId, (cx: number, cz: number) => void> = {
    aida(cx, cz) {
      // Aidina kancelář: světlá, vyšší, terasa s pergolou; velké okno nahoře na rohu, orb nízko nad střechou
      const w = 7.4
      const d = 7.4
      const floors = 7
      const h = floors * FLOOR + 0.3
      contacts.push({ x: cx, z: cz, w, d })
      put('rbox', cx, h / 2 + 0.24, cz, w, h, d, PAL.facadeHero)
      put('rbox', cx, 0.4, cz, w + 0.16, 0.34, d + 0.16, PAL.plinth)
      for (let f = 1; f < floors; f++) put('rbox', cx, f * FLOOR + 0.26, cz, w + 0.18, 0.12, d + 0.18, '#ece0cd')
      put('rbox', cx, h + 0.4, cz, w + 0.3, 0.42, d + 0.3, '#ead7bd')
      put('rbox', cx - 1.5, h + 1.4, cz - 1.6, 3.2, 1.6, 3.0, '#f3e7d6')
      for (let i = 0; i < 6; i++) put('box', cx + 0.4 + i * 0.5, h + 2.05, cz + 1.2, 0.1, 0.1, 3.0, PAL.wood)
      for (const [a, b] of [[0.4, -0.3], [2.9, -0.3], [0.4, 2.7], [2.9, 2.7]]) put('box', cx + a, h + 1.3, cz + b, 0.12, 1.5, 0.12, PAL.wood)
      put('leaf', cx + 2.6, h + 1.1, cz - 2.6, 1.1, 1.1, 1.1, '#8ea56f')
      put('cyl', cx - 2.5, h + 3.4, cz - 2.5, 0.09, 2.4, 0.09, '#6a7385')
      put('rbox', cx, 2.59, cz + d / 2 + 0.5, 2.6, 0.12, 1.1, '#8fa27a')
      // kancelář večer zhasne, v noci svítí jen Aidino okno
      facade(cx, cz, w, d, floors, { from: 0, dark: true })
      const wy = 0.44 + (floors - 1) * FLOOR + FLOOR * 0.55
      addWindow(cx + 1.6, wy, cz + d / 2 + 0.05, 0, 1.7, 1.05, { kind: 2, tint: 0, level: 1 })
      aida = { window: [cx + 1.6, wy, cz + d / 2 + 0.05], orb: [cx + 0.6, h + 2.6, cz + 0.6], roof: h + 0.6 }
    },
    restaurant(cx, cz) {
      // Bistro: pruhovaná markýza, stolky se slunečníky a židlemi na chodníku
      const front = shopHouse(cx, cz, 2, '#efd8bb', ['#c4623f', '#fbf3e6'])
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * 1.55
        const z = front + 2.5
        put('cyl', x, 1.0, z, 0.66, 0.06, 0.66, '#f8f2e8')
        put('cyl', x, 0.65, z, 0.1, 0.7, 0.1, PAL.pole)
        put('cone', x, 2.2, z, 1.75, 0.42, 1.75, i % 2 ? '#c4623f' : '#f3e2c7')
        put('cyl', x, 1.6, z, 0.06, 1.3, 0.06, PAL.pole)
        for (const side of [-1, 1]) put('rbox', x + side * 0.55, 0.6, z, 0.36, 0.5, 0.36, PAL.wood)
      }
      tree(cx - 4.6, front + 2.6, 0.7)
    },
    dental(cx, cz) {
      // Ordinace: bílý dům, mátový pruh a zelený kříž na vývěsce kolmo k fasádě (vidět z ulice)
      const front = shopHouse(cx, cz, 3, '#f5f1ea', null)
      put('rbox', cx, 1.39, front + 0.04, 4.6, 1.35, 0.1, '#3f4b60')
      addWindow(cx, 1.39, front + 0.1, 0, 4.4, 1.15, { kind: 1, on: 7.5, off: 18.5, tint: 1, level: 1 })
      put('rbox', cx, 2.45, front + 0.08, 8.0, 0.3, 0.12, '#8fbfb0')
      const sx = cx + 3.3
      put('box', sx, 3.0, front + 0.5, 0.08, 0.08, 0.8, PAL.pole)
      put('rbox', sx, 3.0, front + 1.0, 0.16, 1.2, 1.2, '#ffffff')
      for (const side of [-1, 1]) {
        put('box', sx + side * 0.09, 3.0, front + 1.0, 0.04, 0.84, 0.28, '#2f9e78')
        put('box', sx + side * 0.09, 3.0, front + 1.0, 0.04, 0.28, 0.84, '#2f9e78')
      }
      put('rbox', cx - 2.6, 3.4, front + 0.12, 1.3, 1.3, 0.12, '#ffffff')
      put('box', cx - 2.6, 3.4, front + 0.2, 0.9, 0.3, 0.04, '#2f9e78')
      put('box', cx - 2.6, 3.4, front + 0.2, 0.3, 0.9, 0.04, '#2f9e78')
      for (const i of [-1, 1]) tree(cx + i * 3.8, front + 2.4, 0.6)
    },
    salon(cx, cz) {
      // Salon: růžová fasáda, velká prosklená výloha s křesly a zrcadly uvnitř, kadeřnická tyč
      const front = shopHouse(cx, cz, 2, '#efc9bc', null)
      put('rbox', cx, 1.5, front + 0.04, 7.2, 1.9, 0.1, '#3f4b60')
      addWindow(cx, 1.5, front + 0.11, 0, 7.0, 1.75, { kind: 1, on: 8.5, off: 20.5, tint: 1, level: 1 })
      for (let i = -2; i <= 2; i++) {
        put('rbox', cx + i * 1.4, 0.95, front - 0.35, 0.55, 0.7, 0.55, '#5d4a5e')
        put('rbox', cx + i * 1.4, 1.8, front - 0.75, 0.7, 0.9, 0.05, '#dfe6ee')
      }
      put('rbox', cx, 2.75, front + 0.35, 7.6, 0.18, 0.7, '#d98a7a')
      put('cyl', cx - 4.05, 1.6, front + 0.3, 0.26, 1.4, 0.26, '#f8f2e8')
      for (let k = 0; k < 4; k++) put('cyl', cx - 4.05, 1.05 + k * 0.36, front + 0.3, 0.28, 0.12, 0.28, k % 2 ? '#5d7896' : '#c4623f')
      put('cone', cx - 4.05, 2.4, front + 0.3, 0.32, 0.25, 0.32, '#e9e2d6')
      for (const i of [-1, 1]) {
        put('cyl', cx + i * 2.9, 0.75, front + 1.3, 0.55, 0.5, 0.55, '#c9b49a')
        put('leaf', cx + i * 2.9, 1.25, front + 1.3, 0.84, 0.84, 0.84, '#8ea56f')
      }
    },
    auto(cx, cz) {
      // Autoservis: dílna, jedna vrata otevřená (uvnitř auto na zvedáku), druhá zavřená, auto před vraty, pneumatiky
      const w = 10
      const d = 7
      const h = 3.8
      const z0 = cz - 1
      const front = z0 + d / 2
      contacts.push({ x: cx, z: z0, w, d })
      put('rbox', cx, h / 2 + 0.24, z0, w, h, d, '#e7dccb')
      put('rbox', cx, h + 0.35, z0, w + 0.3, 0.38, d + 0.3, '#d2c3ad')
      // otevřená vrata: tmavý otvor, vytažená roleta nahoře, uvnitř zvedák s autem a světlo dílny
      put('box', cx - 2.6, 1.65, front - 0.02, 3.0, 2.8, 0.06, '#262a35')
      put('rbox', cx - 2.6, 3.0, front + 0.06, 3.1, 0.4, 0.2, PAL.steel)
      put('box', cx - 3.5, 0.9, front - 1.0, 0.18, 1.2, 0.18, '#d9a441')
      put('box', cx - 1.7, 0.9, front - 1.0, 0.18, 1.2, 0.18, '#d9a441')
      car(cx - 2.6, front - 1.0, Math.PI / 2, '#c4623f', 0.75)
      addWindow(cx - 2.6, 2.95, front - 0.05, 0, 2.6, 0.08, { kind: 1, on: 7, off: 19, tint: 1, level: 1 })
      // zavřená vrata
      put('rbox', cx + 1.0, 1.6, front + 0.04, 3.0, 2.7, 0.12, PAL.steel)
      if (detail) for (let k = 0; k < 6; k++) put('box', cx + 1.0, 0.55 + k * 0.42, front + 0.12, 2.9, 0.04, 0.05, '#4c6078')
      put('rbox', cx + 3.8, 3.2, front + 0.05, 2.4, 0.55, 0.12, '#d9a441')
      car(cx - 2.6, cz + 4.6, Math.PI / 2, '#5d7896')
      for (let i = 0; i < 4; i++) put('torus', cx + 4.2, 0.45 + i * 0.27, cz + 3.6, 0.8, 0.8, 0.8, '#2b2f3a')
      for (let c = 0; c < 2; c++) addWindow(cx + 3.1 + c * 1.2, 1.7, front + 0.03, 0, 0.7, 0.9)
    },
  }

  // ───────── Mřížka ─────────
  const { block: BLOCK, road: ROAD } = GRID
  const N = GRID.n[quality]
  const PITCH = BLOCK + ROAD
  const SIZE = (N * 2 + 1) * PITCH + 3

  // deska diorámy s vrstvami půdy a silnice
  put('rbox', 0, -0.6, 0, SIZE, 1.2, SIZE, PAL.earth[0])
  put('rbox', 0, -2.0, 0, SIZE - 0.5, 1.8, SIZE - 0.5, PAL.earth[1])
  put('rbox', 0, -4.0, 0, SIZE - 1.4, 2.4, SIZE - 1.4, PAL.earth[2])
  put('rbox', 0, -6.0, 0, SIZE - 2.8, 2.2, SIZE - 2.8, PAL.earth[3])
  put('box', 0, 0.02, 0, SIZE - 1, 0.04, SIZE - 1, PAL.road)

  const heroAt = (bx: number, bz: number) => (Object.keys(HERO) as HeroId[]).find((k) => HERO[k][0] === bx && HERO[k][1] === bz)
  for (let bx = -N; bx <= N; bx++) {
    for (let bz = -N; bz <= N; bz++) {
      const cx = bx * PITCH
      const cz = bz * PITCH
      put('rbox', cx, 0.12, cz, BLOCK + 0.4, 0.24, BLOCK + 0.4, PAL.curb)
      put('box', cx, 0.25, cz, BLOCK, 0.04, BLOCK, PAL.sidewalk)
      if (bx < N) for (let k = -4; k <= 4; k += 2) put('box', cx + PITCH / 2, 0.05, cz + k * 1.4, 0.5, 0.03, 1.4, PAL.marking)
      if (bz < N) for (let k = -4; k <= 4; k += 2) put('box', cx + k * 1.4, 0.05, cz + PITCH / 2, 1.4, 0.03, 0.5, PAL.marking)
      const lx = cx + BLOCK / 2 - 0.4
      const lz = cz + BLOCK / 2 - 0.4
      put('cyl', lx, 1.6, lz, 0.12, 2.7, 0.12, PAL.pole)
      put('box', lx - 0.2, 2.92, lz, 0.5, 0.06, 0.06, PAL.pole)
      lamps.push([lx - 0.42, 2.82, lz])

      const hero = heroAt(bx, bz)
      if (PARKS.some(([x, z]) => x === bx && z === bz)) {
        put('rbox', cx, 0.36, cz, BLOCK - 0.8, 0.3, BLOCK - 0.8, PAL.grass)
        put('rbox', cx, 0.53, cz, BLOCK - 0.8, 0.04, 1.4, '#ead9bf')
        put('rbox', cx, 0.53, cz, 1.4, 0.04, BLOCK - 0.8, '#ead9bf')
        put('cyl', cx, 0.6, cz, 2.1, 0.4, 2.1, '#d8cbb6')
        put('cyl', cx, 0.82, cz, 1.5, 0.05, 1.5, '#8fb3c4')
        for (let i = 0; i < 16; i++) {
          const x = cx + (rnd() - 0.5) * (BLOCK - 2.5)
          const z = cz + (rnd() - 0.5) * (BLOCK - 2.5)
          if (Math.abs(x - cx) < 1.2 || Math.abs(z - cz) < 1.2) continue
          tree(x, z, 0.75 + rnd() * 0.6, 0.5)
        }
        continue
      }
      if (hero) {
        HERO_BUILD[hero](cx, cz)
        heroes[hero] = [cx, cz]
        continue
      }
      // výšky: okraje nízké, ke středu výš; Aidini sousedé nejvýš 4 patra (její kancelář má 7),
      // pár věží jen vzadu jako kulisa, aby nezakrývaly Aidu
      const dist = Math.hypot(bx, bz) / (N + 0.5)
      const centrality = 1 - Math.min(1, dist)
      const neighbour = Math.abs(bx) <= 1 && Math.abs(bz) <= 1
      const split = rnd() < 0.5 ? 2 : 3
      const lot = (BLOCK - 1) / split
      for (let i = 0; i < split; i++) {
        for (let j = 0; j < 2; j++) {
          const w = lot - 0.4 - rnd() * 0.5
          const d = (BLOCK - 1) / 2 - 0.5 - rnd() * 0.6
          const x = cx - (BLOCK - 1) / 2 + lot * (i + 0.5)
          const z = cz + (j === 0 ? -1 : 1) * ((BLOCK - 1) / 4)
          let floors = 1 + Math.floor(rnd() * 2.4 + centrality * centrality * 4.5 * rnd())
          if (neighbour) floors = Math.min(floors, 4)
          else if (bz <= -2 && bx <= 0 && bx >= -2 && rnd() < 0.05) floors = 6 + Math.floor(rnd() * 2)
          building(x, z, w, d, floors)
        }
      }
      for (const i of [-1, 1]) for (const t of [-0.3, 0.3]) if (rnd() < 0.75) tree(cx + i * (BLOCK / 2 + 0.3), cz + t * BLOCK + (rnd() - 0.5), 0.55 + rnd() * 0.2, 0.25)
      for (const t of [-0.3, 0.3]) if (rnd() < 0.6) tree(cx + t * BLOCK + (rnd() - 0.5), cz + BLOCK / 2 + 0.3, 0.55 + rnd() * 0.2, 0.25)
    }
  }
  // zaparkovaná auta podél silnic (jezdící přibudou v M3)
  for (let i = 0; i < (detail ? 30 : 16); i++) {
    const horiz = rnd() < 0.5
    const lane = Math.floor(rnd() * (N * 2)) - N + 0.5
    const along = (rnd() - 0.5) * (SIZE - 12)
    const side = rnd() < 0.5 ? -1 : 1
    car(horiz ? along : lane * PITCH + side * 1.05, horiz ? lane * PITCH + side * 1.05 : along, horiz ? 0 : Math.PI / 2, pick(PAL.car))
  }

  return { shapes, windows, contacts, lamps, chimneys, aida, heroes, size: SIZE }
}
