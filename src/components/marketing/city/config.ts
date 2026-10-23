// Aidino město: paleta, čas dne a rozložení. Sdílí ho stavba města (build.ts) i scéna (scene.ts).

/** Paleta z barev webu: tři barvy fasád, terakotové střechy, teplé dřevo; noc v ocelové modři. */
export const PAL = {
  facade: ['#f2e4cf', '#e8cfae', '#e6b998'],
  facadeHero: '#f8f1e6',
  roof: ['#c4623f', '#b4573a', '#cf7450', '#a84e35'],
  slate: ['#8a929c', '#7d8794'],
  shutter: ['#8fa27a', '#6f8aa3', '#a87a52'],
  door: ['#8a5a3c', '#5d7896', '#8fa27a', '#a84e35'],
  trim: '#fbf6ee',
  plinth: '#e6d7c1',
  wood: '#a87a52',
  sidewalk: '#efe3cf',
  road: '#c2b4a1',
  curb: '#f6ecdc',
  marking: '#f1e8da',
  grass: '#b4c08f',
  tree: ['#8ea56f', '#7f9a63', '#9cb07a', '#8aa477'],
  trunk: '#8a6446',
  earth: ['#e3cba7', '#c49a72', '#9b7152', '#7a563f'],
  car: ['#f3e6d2', '#c4623f', '#5d7896', '#d9a441', '#9fb3a2', '#2f3a4f'],
  steel: '#5f7590',
  pole: '#4b5566',
  awning: [
    ['#c4623f', '#fbf3e6'],
    ['#8fa27a', '#fbf3e6'],
    ['#5d7896', '#f3e6d2'],
    ['#d9a441', '#fbf3e6'],
  ] as [string, string][],
}

/** Jeden klíč světla dne: nebe, slunce, okolní světlo, oblaky, nerozsvícená okna, hvězdy, mlha. */
export interface SkyKey {
  h: number
  top: string
  hor: string
  sun: string
  si: number
  hs: string
  hg: string
  hi: number
  cloud: string
  win: string
  stars: number
  fog: number
}

// Hodiny 5,5–26,5 (26 = 02:00 dalšího dne). Stíny jsou chladné (okolní světlo z nebe), slunce teplé.
// Zlatá hodina: fialovější stíny a chladnější nebe nahoře, aby to nebyl jeden oranžový filtr.
export const SKY_KEYS: SkyKey[] = [
  { h: 5.5, top: '#2b3466', hor: '#e9a58a', sun: '#ff9d6b', si: 0.5, hs: '#6f7fae', hg: '#5a4a4e', hi: 0.45, cloud: '#f4b9a0', win: '#3a4865', stars: 0.3, fog: 0.5 },
  { h: 8.5, top: '#8fbbe6', hor: '#fde9d2', sun: '#ffd09a', si: 4.2, hs: '#b9cde6', hg: '#d9c0a0', hi: 0.7, cloud: '#fff4e6', win: '#58687c', stars: 0, fog: 0.35 },
  { h: 12.5, top: '#78ade3', hor: '#f3ece2', sun: '#fff1dc', si: 4.6, hs: '#b9cde6', hg: '#e0caa8', hi: 0.62, cloud: '#ffffff', win: '#5f7085', stars: 0, fog: 0.15 },
  { h: 16.5, top: '#86a3d2', hor: '#ffd6a0', sun: '#ffc27a', si: 4.0, hs: '#aeb2d8', hg: '#c99a72', hi: 0.7, cloud: '#ffe6c6', win: '#5a6579', stars: 0, fog: 0.35 },
  { h: 18.25, top: '#36458f', hor: '#ff9f63', sun: '#ff9a52', si: 3.6, hs: '#6c66bf', hg: '#4a3346', hi: 0.7, cloud: '#ffb48a', win: '#47486e', stars: 0.05, fog: 0.42 },
  { h: 19.5, top: '#27296a', hor: '#a0608a', sun: '#d0707a', si: 0.4, hs: '#5a539a', hg: '#2c2236', hi: 0.5, cloud: '#9a7fa8', win: '#33335a', stars: 0.4, fog: 0.5 },
  { h: 21, top: '#0f1840', hor: '#2c3a6e', sun: '#9cb2ff', si: 0.55, hs: '#3a4a86', hg: '#121730', hi: 0.38, cloud: '#46557f', win: '#1c2446', stars: 0.95, fog: 0.5 },
  // nejhlubší noc (00–03 h): nebe skoro černomodré, okolní světlo slabé, ať vynikne měsíc, mléčná dráha a Aida
  { h: 24.2, top: '#030617', hor: '#0e173e', sun: '#9cb2ff', si: 0.55, hs: '#212d62', hg: '#080b1c', hi: 0.29, cloud: '#262f58', win: '#11172f', stars: 1, fog: 0.5 },
  { h: 26.5, top: '#01030b', hor: '#080e28', sun: '#9cb2ff', si: 0.5, hs: '#1a2452', hg: '#05070f', hi: 0.24, cloud: '#1d2546', win: '#0d1226', stars: 1, fog: 0.5 },
  // svítání dalšího dne (konec příběhu): 04:00 → 05:36 modrá hodina → 06:30 východ slunce
  { h: 28, top: '#040a26', hor: '#1e2a5c', sun: '#9cb2ff', si: 0.45, hs: '#25316a', hg: '#090c1c', hi: 0.28, cloud: '#2b3563', win: '#11172f', stars: 0.8, fog: 0.5 },
  { h: 29.6, top: '#2b3466', hor: '#e9a58a', sun: '#ff9d6b', si: 0.6, hs: '#6f7fae', hg: '#5a4a4e', hi: 0.45, cloud: '#f4b9a0', win: '#3a4865', stars: 0.15, fog: 0.5 },
  { h: 30.5, top: '#7fa9d8', hor: '#ffd9b0', sun: '#ffc48a', si: 3.2, hs: '#aebfdc', hg: '#cdb090', hi: 0.62, cloud: '#ffe8d2', win: '#56657c', stars: 0, fog: 0.4 },
]

export const DAY_START = 8
export const DAY_END = 26
/** Konec příběhu: svítání dalšího dne (06:30). */
export const DAWN_END = 30.5

/** Mřížka města: bloky BLOCK × BLOCK, mezi nimi silnice. N = počet bloků od středu (desktop / mobil). */
export const GRID = { block: 12, road: 4.4, n: { high: 4, low: 3 } }
export const FLOOR = 1.6

/** Hrdinské budovy (souřadnice bloků) a parky. Aidina kancelář je uprostřed. */
export const HERO = { aida: [0, 0], restaurant: [-1, 0], dental: [1, -1], salon: [0, 1], auto: [1, 1] } as const
export type HeroId = keyof typeof HERO
export const PARKS: [number, number][] = [
  [-1, 1],
  [2, -2],
  [-2, -2],
]

/** Výchozí kamera scény (dioráma nad střechami); slouží i jako reference pro polohu slunce a měsíce na obloze. */
export const CAMERA = { pos: [60, 27, 72] as const, target: [-2, 9.6, -10] as const, fov: 30 }
