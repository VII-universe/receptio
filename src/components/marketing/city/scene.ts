// Aidino město ve 3D (Three.js): instancované budovy z build.ts, čas dne řízený jednou hodnotou `hour`,
// nebe s oblaky ve vrstvách, hvězdy s mléčnou dráhou, ptáci, kouř z komínů a orb Aidy nad kanceláří.
// Načítá se dynamicky až po vykreslení textu stránky (city-canvas.tsx).

import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CustomBlending,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Fog,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  Quaternion,
  Scene,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  SpotLight,
  SRGBColorSpace,
  TorusGeometry,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { buildCity, type Inst, type Shape as ShapeKind } from './build'
import { CAMERA, SKY_KEYS, type SkyKey } from './config'

export type Quality = 'high' | 'low'

export interface CityStats {
  fps: number
  worst: number
  calls: number
  tris: number
  pixelRatio: number
  scale: number
  quality: Quality
  renderer: string
}

export interface CityController {
  /** Hodina dne 5,5–26,5 (26 = 02:00). */
  setHour(h: number): void
  /** Poloha kamery na trase 0–1. */
  setView(t: number): void
  /** Natočení myší (-1…1), kamera se pootočí nejvýš o ~2°. */
  setPointer(x: number, y: number): void
  /** Hlasitost Aidy 0–1 (orb se rozvlní). */
  setVoice(level: number): void
  /** Zdroj hlasitosti čtený v každém snímku (úrovně přehrávače ukázek). */
  setVoiceSource(read: (() => number) | null): void
  /** Úvod: město vyroste ze země a vyjde slunce (do 1,2 s). Bez volání je město rovnou postavené. */
  playIntro(): void
  setSize(w: number, h: number): void
  start(): void
  stop(): void
  /** Jeden snímek bez smyčky (statické vykreslení, omezený pohyb). */
  renderOnce(): void
  stats(): CityStats
  dispose(): void
}

// ───────── Čas dne → světlo ─────────
const KEYS = SKY_KEYS.map((k) => ({
  ...k,
  c: Object.fromEntries((['top', 'hor', 'sun', 'hs', 'hg', 'cloud', 'win'] as const).map((n) => [n, new Color(k[n])])) as Record<'top' | 'hor' | 'sun' | 'hs' | 'hg' | 'cloud' | 'win', Color>,
}))
type Light = Record<'top' | 'hor' | 'sun' | 'hs' | 'hg' | 'cloud' | 'win', Color> & Pick<SkyKey, 'si' | 'hi' | 'stars' | 'fog'>
const lightNow: Light = { top: new Color(), hor: new Color(), sun: new Color(), hs: new Color(), hg: new Color(), cloud: new Color(), win: new Color(), si: 0, hi: 0, stars: 0, fog: 0 }
function lightAt(h: number): Light {
  let i = 0
  while (i < KEYS.length - 2 && h > KEYS[i + 1].h) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const k = MathUtils.clamp((h - a.h) / (b.h - a.h), 0, 1)
  for (const n of ['top', 'hor', 'sun', 'hs', 'hg', 'cloud', 'win'] as const) lightNow[n].copy(a.c[n]).lerp(b.c[n], k)
  for (const n of ['si', 'hi', 'stars', 'fog'] as const) lightNow[n] = a[n] + (b[n] - a[n]) * k
  return lightNow
}
const smooth = (a: number, b: number, x: number) => {
  const t = MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// Směry slunce a měsíce: vzhledem k výchozí kameře. Ráno zleva a trochu zezadu (fasády k divákovi nasvícené),
// v poledne vysoko, večer zprava. Disk na obloze je stylizovaný: večer zapadá vpravo v záběru, v noci měsíc vpravo nahoře.
const REF = (() => {
  const cam = new PerspectiveCamera(CAMERA.fov, 1440 / 900, 1, 1000)
  cam.position.set(...CAMERA.pos)
  cam.lookAt(new Vector3(...CAMERA.target))
  cam.updateMatrixWorld()
  const fwd = new Vector3(...CAMERA.target).sub(cam.position).setY(0).normalize()
  return { cam, fwd, left: new Vector3(fwd.z, 0, -fwd.x), back: fwd.clone().negate() }
})()
const W = (l: number, b: number, el: number) => {
  const e = MathUtils.degToRad(el)
  return REF.left.clone().multiplyScalar(l).add(REF.back.clone().multiplyScalar(b)).normalize().multiplyScalar(Math.cos(e)).setY(Math.sin(e)).normalize()
}
const ndcDir = (x: number, y: number) => new Vector3(x, y, 0.5).unproject(REF.cam).sub(REF.cam.position).normalize()
const SUN_KEYS = [
  { h: 6, d: W(1, 0.15, 2) },
  { h: 8.5, d: W(0.92, 0.5, 21) },
  { h: 12.5, d: W(0.15, 1, 58) },
  { h: 16.5, d: W(-0.8, 0.55, 30) },
  { h: 18.25, d: W(-1, 0.22, 9) },
  { h: 19.6, d: W(-1, -0.15, 0) },
]
const MOON = W(-0.55, -0.6, 36)
const MOON_DISC = ndcDir(0.42, 0.84) // ať je měsíc v záběru na šířku i na výšku
const qa = new Quaternion()
const qb = new Quaternion()
const Z = new Vector3(0, 0, 1)
function sunDir(h: number, out: Vector3) {
  if (h < 6 || h > 19.6) return out.copy(MOON)
  let i = 0
  while (i < SUN_KEYS.length - 2 && h > SUN_KEYS[i + 1].h) i++
  const a = SUN_KEYS[i]
  const b = SUN_KEYS[i + 1]
  qa.setFromUnitVectors(Z, a.d)
  qb.setFromUnitVectors(Z, b.d)
  return out.copy(Z).applyQuaternion(qa.slerp(qb, MathUtils.clamp((h - a.h) / (b.h - a.h), 0, 1)))
}
function discDir(h: number, out: Vector3) {
  if (h >= 17.4 && h <= 19.8) {
    const k = (h - 17.4) / 2.4
    return out.copy(ndcDir(0.85 - 0.3 * k, 0.42 - 0.48 * k))
  }
  if (h > 19.8 || h < 6) return out.copy(MOON_DISC)
  return sunDir(h, out)
}

// ───────── Shadery ─────────
const SKY_VERT = 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }'
const SKY_FRAG = /* glsl */ `
uniform vec3 uTop, uHor, uFog, uSun, uDisc, uGlowDir; uniform float uMoon, uLow, uShowDisc, uNight, uDeep, uTime;
varying vec3 vDir;
float h1(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(mix(h1(i), h1(i+vec3(1,0,0)), f.x), mix(h1(i+vec3(0,1,0)), h1(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h1(i+vec3(0,0,1)), h1(i+vec3(1,0,1)), f.x), mix(h1(i+vec3(0,1,1)), h1(i+vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  // plynulý náběh od obzoru (bez švu), nahoře rychle do chladné horní barvy
  vec3 c = mix(uHor, uTop, 1. - exp(-max(h, 0.) * 7.5));
  c = mix(c, uFog, smoothstep(0.02, -0.12, h));
  // záře slunce podle směru světla, disk (slunce / měsíc) podle stylizované polohy na obloze
  float g = max(dot(d, uGlowDir), 0.);
  float s = max(dot(d, uDisc), 0.);
  if (uMoon < 0.5) {
    c += uSun * (pow(g, 22.) * (0.22 + uLow * 0.6) + pow(g, 6.) * uLow * 0.1);
    c += uSun * smoothstep(0.99955, 0.99972, s) * 2.2 * uShowDisc + uSun * pow(s, 40.) * 0.25 * uShowDisc;
  } else {
    c += vec3(0.93, 0.94, 1.) * smoothstep(0.99962, 0.99975, s) * 0.95 + vec3(0.45, 0.52, 0.85) * pow(s, 120.) * 0.18;
  }
  // mléčná dráha: prašný pás přes noční nebe (přes den se nepočítá)
  // pás vede šikmo přes viditelnou oblohu: zleva u obzoru doprava nahoru
  if (uNight > 0.01) {
    vec3 mwN = normalize(vec3(0.105, -0.968, -0.232));
    float band = exp(-pow(dot(d, mwN) / 0.055, 2.));
    float dust = n3(d * 18.) * 0.6 + n3(d * 46.) * 0.4;
    float rift = smoothstep(0.55, 0.75, n3(d * 9. + 3.)) * exp(-pow(dot(d, mwN) / 0.02, 2.));
    c += vec3(0.62, 0.66, 0.95) * band * pow(dust, 1.6) * (1. - rift * 0.8) * uNight * (0.22 + uDeep * 0.16) * smoothstep(0.01, 0.08, h);
  }
  gl_FragColor = vec4(c, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

// Úvod: objekty vyrostou ze země, od středu města k okrajům (uRise 0 → 1,15). Vkládá se místo project_vertex.
const RISE_GLSL = /* glsl */ `
float riseAt(vec3 c) { float k = clamp(uRise * 1.8 - length(c.xz) / 100., 0., 1.); return 1. - pow(1. - k, 3.); }`
const PROJECT_RISE = /* glsl */ `
vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
  vec3 riseC = (instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
#else
  vec3 riseC = vec3(0.);
#endif
if (mvPosition.y > 0.) mvPosition.y *= riseAt(riseC);
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`

// okna: barva se počítá z hodiny v shaderu (rozsvícení podle časů okna), CPU nic nepřepočítává.
// Každé okno má vlastní jas a teplotu (teplá kuchyň, neutrální pokoj, modrá televize, která se mihotá).
const WIN_VERT = /* glsl */ `
attribute vec2 aOnOff; attribute float aKind; attribute float aSeed; attribute float aTint; attribute float aLevel;
uniform float uHour, uNight, uTime, uRise; uniform vec3 uGlass;
varying vec3 vCol;
#include <fog_pars_vertex>
${RISE_GLSL}
void main(){
  float on = step(aOnOff.x, uHour) * step(uHour, aOnOff.y);
  if (aKind > 1.5) on = 1.;
  vec3 lit = aTint < 0.5 ? vec3(1., 0.64, 0.32) : aTint < 1.5 ? vec3(1., 0.8, 0.54) : vec3(0.52, 0.66, 1.);
  float level = aLevel;
  if (aTint > 1.5) level *= 0.72 + 0.28 * sin(uTime * 6.3 + aSeed * 50.) * sin(uTime * 2.1 + aSeed * 17.);
  float boost = aKind > 1.5 ? mix(2.2, 4.2, uNight) : mix(1.1, 1.75, uNight) * level;
  vCol = mix(uGlass * (0.82 + aSeed * 0.3), lit * boost, on);
  vec4 w = instanceMatrix * vec4(position, 1.);
  w.y *= riseAt((instanceMatrix * vec4(0., 0., 0., 1.)).xyz);
  vec4 mvPosition = modelViewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const WIN_FRAG = /* glsl */ `
varying vec3 vCol;
#include <fog_pars_fragment>
void main(){
  gl_FragColor = vec4(vCol, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

// oblaky: instancované billboardy z atlasu kreslených kup, plují a na krajích trasy se rozplynou
const CLOUD_VERT = /* glsl */ `
attribute vec3 aPos; attribute vec2 aScale; attribute float aTile; attribute float aSpeed; attribute float aAlpha;
uniform float uTime, uSpan;
varying vec2 vUv; varying float vA;
void main(){
  float x = mod(aPos.x + uTime * aSpeed + uSpan, uSpan * 2.) - uSpan;
  vec4 mvCenter = viewMatrix * vec4(x, aPos.y, aPos.z, 1.);
  vec4 mv = mvCenter + vec4(position.xy * aScale, 0., 0.);
  gl_Position = projectionMatrix * mv;
  float col = mod(aTile, 2.); float row = floor(aTile / 2.);
  vUv = vec2((uv.x + col) / 2., (uv.y + row) / 3.);
  vA = aAlpha * smoothstep(uSpan, uSpan * 0.75, abs(x));
}`
const CLOUD_FRAG = /* glsl */ `
uniform sampler2D uMap; uniform vec3 uColor, uShade; uniform float uOpacity;
varying vec2 vUv; varying float vA;
void main(){
  vec4 t = texture2D(uMap, vUv);
  vec3 c = mix(uShade, uColor, t.r);
  gl_FragColor = vec4(c, t.a * vA * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

// hvězdy: kulaté body, jemně blikají
const STAR_VERT = /* glsl */ `
attribute float aSize; attribute float aSeed;
uniform float uTime, uPx;
varying float vTw;
void main(){
  vTw = 0.65 + 0.35 * sin(uTime * (0.6 + aSeed * 1.6) + aSeed * 40.);
  gl_PointSize = aSize * uPx;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`
const STAR_FRAG = /* glsl */ `
uniform float uOpacity; varying float vTw;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(0.93, 0.94, 1.) * 1.6, a * vTw * uOpacity);
}`

// kouř z komínů: částice stoupají, rostou a rozplývají se ve větru
const SMOKE_VERT = /* glsl */ `
attribute vec3 aBase; attribute float aPhase;
uniform float uTime, uPx;
varying float vA;
void main(){
  float t = fract(uTime * 0.06 + aPhase);
  vec3 p = aBase + vec3(t * 2.4 + sin(t * 4. + aPhase * 9.) * 0.35, t * 6.5, -t * 1.2);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_PointSize = mix(1.1, 3.8, t) * uPx * 820. / -mv.z;
  gl_Position = projectionMatrix * mv;
  vA = smoothstep(0., 0.1, t) * (1. - t) * 0.8;
}`
const SMOKE_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uOpacity; varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor, a * a * vA * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

// orb Aidy (stejný jazyk jako na webu), menší a tišší: světlo hlavně dolů na střechu
const ORB_FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uAmp, uBoost; uniform vec3 uTint; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * n(p); p *= 2.03; a *= .5; } return v; }
void main(){
  vec2 p = vUv - .5; float px = fwidth(p.x);
  float r = length(p), t = uTime; vec2 dir = p / max(r, 1e-4);
  float n1 = fbm(dir * 1.3 + vec2(t * .21, -t * .16)); float n2 = n(dir * 1.8 + vec2(-t * .8, t * .6));
  float R0 = .26 + .01 * sin(t * 1.05) + uAmp * .04;
  float R = R0 + ((n1 - .5) * (.03 + uAmp * .09) + (n2 - .5) * uAmp * .05);
  float d = r - R;
  float body = smoothstep(px * 1.5, -px * 1.5, d);
  float flow = fbm(p * 4.5 + vec2(t * .22, t * .15) + fbm(p * 3. - t * .1));
  vec3 c = uTint * (.62 + .75 * flow);
  c = mix(c, uTint * .5, smoothstep(.1, 1.1, length(p - vec2(.08, -.09)) / R0) * .45);
  c += vec3(1., .82, .6) * pow(flow, 3.) * .55;
  c += vec3(1., .95, .88) * smoothstep(.9, 0., length(p - vec2(-.06, .07)) / R0) * .5;
  float glow = exp(-max(d, 0.) * 16.) * .32;
  float ring = exp(-pow((d - .07) / .008, 2.)) * .08 * (.4 + uAmp);
  float edge = smoothstep(.5, .32, r);
  float outA = clamp(glow + ring, 0., 1.) * edge;
  float alpha = body + (1. - body) * outA;
  vec3 rgb = c * body + mix(uTint, vec3(1., .9, .8), .2) * outA * (1. - body);
  gl_FragColor = vec4(rgb * uBoost, alpha);
}`

const TILT_FRAG = /* glsl */ `
uniform sampler2D tDiffuse; uniform float uAmount, uFocus, uBand, uH, uVignette; varying vec2 vUv;
void main(){
  float k = smoothstep(uBand, uBand + 0.4, abs(vUv.y - uFocus));
  if (vUv.y > uFocus) k *= 0.3;
  vec2 dir = (uH > 0.5 ? vec2(uAmount, 0.) : vec2(0., uAmount)) * k * 2.4;
  vec4 s = texture2D(tDiffuse, vUv) * 0.2270270270;
  s += (texture2D(tDiffuse, vUv + dir * 1.3846153846) + texture2D(tDiffuse, vUv - dir * 1.3846153846)) * 0.3162162162;
  s += (texture2D(tDiffuse, vUv + dir * 3.2307692308) + texture2D(tDiffuse, vUv - dir * 3.2307692308)) * 0.0702702703;
  if (uH < 0.5) { vec2 v = vUv - 0.5; s.rgb *= mix(1., 1. - uVignette, smoothstep(0.35, 0.85, length(v * vec2(1.1, 1.3)))); }
  gl_FragColor = s;
}`
const PASS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }'

// ───────── Textury z plátna ─────────
function cloudAtlas(rnd: () => number) {
  // 2 × 3 kreslené kupy: rovná spodní hrana, nadýchaný vršek; R = jas (spodek tmavší), A = tvar
  const cv = document.createElement('canvas')
  cv.width = 1024
  cv.height = 768
  const g = cv.getContext('2d')!
  for (let tile = 0; tile < 6; tile++) {
    const ox = (tile % 2) * 512
    const oy = (2 - Math.floor(tile / 2)) * 256
    g.save()
    g.translate(ox, oy)
    const n = 6 + Math.floor(rnd() * 4)
    g.fillStyle = '#fff'
    g.filter = 'blur(6px)'
    for (let i = 0; i < n; i++) {
      const x = 70 + (i / (n - 1)) * 372 + (rnd() - 0.5) * 30
      const mid = 1 - Math.abs(i / (n - 1) - 0.5) * 2
      const r = 30 + mid * 46 + rnd() * 18
      g.beginPath()
      g.arc(x, 196 - r * (0.55 + rnd() * 0.25), r, 0, Math.PI * 2)
      g.fill()
    }
    g.fillRect(60, 160, 392, 40)
    g.filter = 'none'
    g.globalCompositeOperation = 'source-atop'
    const sh = g.createLinearGradient(0, 30, 0, 205)
    sh.addColorStop(0, '#ffffff')
    sh.addColorStop(0.55, '#f2f2f2')
    sh.addColorStop(1, '#5a5a5a')
    g.fillStyle = sh
    g.fillRect(0, 0, 512, 256)
    g.restore()
  }
  const tex = new CanvasTexture(cv)
  tex.colorSpace = SRGBColorSpace
  return tex
}
function contactTexture() {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 64
  const g = cv.getContext('2d')!
  const img = g.createImageData(64, 64)
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const dx = Math.max(0, Math.abs(x - 31.5) / 31.5 - 0.62) / 0.38
      const dy = Math.max(0, Math.abs(y - 31.5) / 31.5 - 0.62) / 0.38
      const a = Math.max(0, 1 - Math.hypot(dx, dy))
      img.data.set([0, 0, 0, Math.round(a * a * 255)], (y * 64 + x) * 4)
    }
  g.putImageData(img, 0, 0)
  return new CanvasTexture(cv)
}

// ───────── Jednotkové tvary ─────────
function gableUnit() {
  const s = new Shape()
  s.moveTo(-0.5, 0)
  s.lineTo(0.5, 0)
  s.lineTo(0, 1)
  s.closePath()
  const g = new ExtrudeGeometry(s, { depth: 1, bevelEnabled: false })
  g.translate(0, 0, -0.5)
  g.rotateY(Math.PI / 2)
  return g
}
function hipUnit() {
  const g = new CylinderGeometry(0, Math.SQRT1_2, 1, 4, 1)
  g.rotateY(Math.PI / 4)
  g.translate(0, 0.5, 0)
  return g
}
function leafUnit() {
  const g = new IcosahedronGeometry(0.5, 1).toNonIndexed()
  g.computeVertexNormals()
  return g
}

/** Předá vlákno prohlížeči mezi kroky stavby (žádná dlouhá úloha, která by blokovala stránku). */
const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0))

/**
 * Postaví scénu po krocích (data města, budovy, nebe, život) a shadery zkompiluje na pozadí
 * (KHR_parallel_shader_compile), takže start nezablokuje hlavní vlákno jednou dlouhou úlohou.
 */
export async function createCity(canvas: HTMLCanvasElement, opts: { quality: Quality; dpr: number; portrait: boolean }): Promise<CityController> {
  const { quality } = opts
  const high = quality === 'high'
  const data = buildCity(quality)
  await yieldToMain()
  let seed = 7
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

  const renderer = new WebGLRenderer({ canvas, antialias: high, alpha: false, powerPreference: 'high-performance' })
  const basePR = Math.min(opts.dpr, high ? 1.75 : 1)
  let scale = 1
  renderer.setPixelRatio(basePR)
  renderer.toneMapping = NeutralToneMapping
  renderer.shadowMap.enabled = high
  renderer.shadowMap.type = PCFShadowMap
  renderer.info.autoReset = false

  const scene = new Scene()
  scene.fog = new Fog(0xffffff, 95, 330)
  const camera = new PerspectiveCamera(CAMERA.fov, 1, 1, 1600)

  // ───────── Město (instancované tvary) ─────────
  const solid = new MeshStandardMaterial({ roughness: 0.92, metalness: 0 })
  const leafMat = new MeshStandardMaterial({ roughness: 1, metalness: 0, flatShading: true })
  const rise = { value: 1.15 }
  const withRise = (m: MeshStandardMaterial | MeshBasicMaterial) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRise = rise
      sh.vertexShader = `uniform float uRise;\n${RISE_GLSL}\n` + sh.vertexShader.replace('#include <project_vertex>', PROJECT_RISE)
    }
    return m
  }
  withRise(solid)
  withRise(leafMat)
  const UNITS: Record<ShapeKind, BufferGeometry> = {
    rbox: high ? new RoundedBoxGeometry(1, 1, 1, 1, 0.06) : new BoxGeometry(1, 1, 1),
    box: new BoxGeometry(1, 1, 1),
    gable: gableUnit(),
    hip: hipUnit(),
    cyl: new CylinderGeometry(0.5, 0.5, 1, high ? 10 : 6),
    cone: new ConeGeometry(0.5, 1, high ? 12 : 8),
    leaf: leafUnit(),
    torus: new TorusGeometry(0.5, 0.18, 6, 14).rotateX(Math.PI / 2),
  }
  const m4 = new Matrix4()
  const q = new Quaternion()
  const e = new Euler(0, 0, 0, 'YXZ')
  const p3 = new Vector3()
  const s3 = new Vector3()
  const col = new Color()
  const disposables: { dispose(): void }[] = [solid, leafMat, ...Object.values(UNITS)]
  const instanced = (geo: BufferGeometry, mat: MeshStandardMaterial | MeshBasicMaterial, list: Inst[], shadow = high) => {
    const mesh = new InstancedMesh(geo, mat, list.length)
    list.forEach((it, i) => {
      e.set(it.rx, it.ry, 0)
      m4.compose(p3.set(it.x, it.y, it.z), q.setFromEuler(e), s3.set(it.sx, it.sy, it.sz))
      mesh.setMatrixAt(i, m4)
      mesh.setColorAt(i, col.set(it.c))
    })
    mesh.computeBoundingSphere()
    mesh.castShadow = mesh.receiveShadow = shadow
    scene.add(mesh)
    return mesh
  }
  // drobné hranaté díly (parapety, okenice, značení, chodníky) stíny jen přijímají, nevrhají
  for (const kind of Object.keys(UNITS) as ShapeKind[])
    if (data.shapes[kind].length) {
      const mesh = instanced(UNITS[kind], kind === 'leaf' ? leafMat : solid, data.shapes[kind])
      if (kind === 'box' || kind === 'torus') mesh.castShadow = false
    }

  await yieldToMain()
  // kontaktní stíny
  const contactTex = contactTexture()
  const contactMat = new MeshBasicMaterial({ map: contactTex, color: '#2a1d24', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  const contactGeo = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  const contacts = new InstancedMesh(contactGeo, contactMat, data.contacts.length)
  data.contacts.forEach((c, i) => contacts.setMatrixAt(i, m4.compose(p3.set(c.x, 0.29, c.z), q.identity(), s3.set(c.w + 1.6, 1, c.d + 1.6))))
  contacts.computeBoundingSphere()
  contacts.renderOrder = 1
  scene.add(contacts)
  disposables.push(contactTex, contactMat, contactGeo)

  // okna
  const winGeo = new PlaneGeometry(1, 1)
  const W_ = data.windows
  winGeo.setAttribute('aOnOff', new InstancedBufferAttribute(new Float32Array(W_.flatMap((w) => [w.on, w.off])), 2))
  winGeo.setAttribute('aKind', new InstancedBufferAttribute(new Float32Array(W_.map((w) => w.kind)), 1))
  winGeo.setAttribute('aSeed', new InstancedBufferAttribute(new Float32Array(W_.map((w) => w.seed)), 1))
  winGeo.setAttribute('aTint', new InstancedBufferAttribute(new Float32Array(W_.map((w) => w.tint)), 1))
  winGeo.setAttribute('aLevel', new InstancedBufferAttribute(new Float32Array(W_.map((w) => w.level)), 1))
  const winMat = new ShaderMaterial({
    uniforms: { ...UniformsUtils.merge([UniformsLib.fog, { uHour: { value: 8 }, uNight: { value: 0 }, uTime: { value: 0 }, uGlass: { value: new Color() } }]), uRise: rise },
    vertexShader: WIN_VERT,
    fragmentShader: WIN_FRAG,
    fog: true,
  })
  const winMesh = new InstancedMesh(winGeo, winMat, W_.length)
  W_.forEach((w, i) => {
    e.set(0, w.ry, 0)
    winMesh.setMatrixAt(i, m4.compose(p3.set(w.x, w.y, w.z), q.setFromEuler(e), s3.set(w.w, w.h, 1)))
  })
  winMesh.computeBoundingSphere()
  scene.add(winMesh)
  disposables.push(winGeo, winMat)

  // lampy
  const lampGeo = new SphereGeometry(0.13, 8, 6)
  const lampMat = withRise(new MeshBasicMaterial({ color: '#efe6d4' }))
  const lampMesh = new InstancedMesh(lampGeo, lampMat, data.lamps.length)
  data.lamps.forEach((l, i) => lampMesh.setMatrixAt(i, m4.makeTranslation(l[0], l[1], l[2])))
  lampMesh.computeBoundingSphere()
  scene.add(lampMesh)
  disposables.push(lampGeo, lampMat)

  // ───────── Světla ─────────
  const hemi = new HemisphereLight()
  const key = new DirectionalLight()
  const focus = new Vector3(0, 0, -2)
  key.target.position.copy(focus)
  if (high) {
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.radius = 4
    key.shadow.bias = -0.0005
    key.shadow.normalBias = 0.035
    Object.assign(key.shadow.camera, { left: -44, right: 44, top: 44, bottom: -44, near: 40, far: 280 })
  }
  scene.add(hemi, key, key.target)
  const [ox, oy, oz] = data.aida.orb
  const orbLight = new SpotLight('#ff8a4c', 0, 11, 0.95, 0.85, 2)
  orbLight.position.set(ox, oy - 0.4, oz)
  orbLight.target.position.set(ox, data.aida.roof - 1, oz)
  scene.add(orbLight, orbLight.target)
  const winLight = new PointLight('#ffa860', 0, 9, 2)
  winLight.position.set(data.aida.window[0], data.aida.window[1] - 0.4, data.aida.window[2] + 1.4)
  scene.add(winLight)
  // pouliční lampy se skutečným světlem jen u Aidiny kanceláře (počet světel je pevný, mění se jen jas)
  const nearLamps = high
    ? data.lamps
        .map((l) => ({ l, d: Math.hypot(l[0] - ox, l[2] - oz) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 6)
        .map(({ l }) => {
          const pl = new PointLight('#ffc27a', 0, 8, 2)
          pl.position.set(l[0], l[1] - 0.4, l[2])
          scene.add(pl)
          return pl
        })
    : []

  await yieldToMain()
  // ───────── Nebe ─────────
  const skyMat = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new Color() }, uHor: { value: new Color() }, uFog: { value: new Color() }, uSun: { value: new Color() },
      uDisc: { value: new Vector3() }, uGlowDir: { value: new Vector3() }, uMoon: { value: 0 }, uLow: { value: 0 }, uShowDisc: { value: 0 }, uNight: { value: 0 }, uDeep: { value: 0 }, uTime: { value: 0 },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
  })
  const skyGeo = new SphereGeometry(1200, 32, 16)
  const sky = new Mesh(skyGeo, skyMat)
  sky.renderOrder = -10
  scene.add(sky)
  disposables.push(skyMat, skyGeo)

  // hvězdy (víc u mléčné dráhy)
  const starMat = new ShaderMaterial({ uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uOpacity: { value: 0 } }, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, fog: false })
  {
    const count = high ? 3600 : 1600
    const pos: number[] = []
    const size: number[] = []
    const sd: number[] = []
    const mwN = new Vector3(0.105, -0.968, -0.232).normalize()
    for (let i = 0; i < count; i++) {
      const v = new Vector3()
      if (i % 3 === 0) {
        // podél pásu mléčné dráhy
        const a = rnd() * Math.PI * 2
        const u = new Vector3(1, 0, 0).cross(mwN).normalize()
        const w = mwN.clone().cross(u)
        v.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a)).addScaledVector(mwN, (rnd() - 0.5) * 0.12).normalize()
        if (v.y < 0.04) v.y = Math.abs(v.y) + 0.04
      } else {
        const th = rnd() * Math.PI * 2
        const y = 0.02 + Math.pow(rnd(), 2.2) * 0.98 // víc hvězd níž nad obzorem, kde je obloha v záběru
        const r = Math.sqrt(1 - y * y)
        v.set(Math.cos(th) * r, y, Math.sin(th) * r)
      }
      v.normalize().multiplyScalar(1100)
      pos.push(v.x, v.y, v.z)
      size.push(rnd() < 0.07 ? 3.4 + rnd() * 1.8 : 1.6 + rnd() * 1.8)
      sd.push(rnd())
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('aSize', new Float32BufferAttribute(size, 1))
    g.setAttribute('aSeed', new Float32BufferAttribute(sd, 1))
    const stars = new Points(g, starMat)
    stars.renderOrder = -9
    stars.frustumCulled = false
    scene.add(stars)
    disposables.push(g, starMat)
  }

  await yieldToMain()
  // oblaky ve třech vrstvách (paralaxa vzniká pohybem kamery, vrstvy plují různou rychlostí)
  const cloudTex = cloudAtlas(rnd)
  const cloudGeo = new PlaneGeometry(1, 0.5)
  const cloudPos: number[] = []
  const cloudScale: number[] = []
  const cloudTile: number[] = []
  const cloudSpeed: number[] = []
  const cloudAlpha: number[] = []
  const layers = [
    { n: high ? 9 : 6, z: [-760, -600], y: [80, 130], s: [120, 190], v: 0.5, a: 0.75 },
    { n: high ? 12 : 7, z: [-520, -380], y: [42, 78], s: [55, 95], v: 0.9, a: 0.92 },
    { n: high ? 8 : 4, z: [-300, -200], y: [30, 46], s: [30, 48], v: 1.6, a: 0.85 },
  ]
  for (const L of layers)
    for (let i = 0; i < L.n; i++) {
      cloudPos.push(-520 + rnd() * 1040, L.y[0] + rnd() * (L.y[1] - L.y[0]), L.z[0] + rnd() * (L.z[1] - L.z[0]))
      const s = L.s[0] + rnd() * (L.s[1] - L.s[0])
      cloudScale.push(s, s)
      cloudTile.push(Math.floor(rnd() * 6))
      cloudSpeed.push(L.v * (0.8 + rnd() * 0.4))
      cloudAlpha.push(L.a)
    }
  const cloudCount = cloudTile.length
  cloudGeo.setAttribute('aPos', new InstancedBufferAttribute(new Float32Array(cloudPos), 3))
  cloudGeo.setAttribute('aScale', new InstancedBufferAttribute(new Float32Array(cloudScale), 2))
  cloudGeo.setAttribute('aTile', new InstancedBufferAttribute(new Float32Array(cloudTile), 1))
  cloudGeo.setAttribute('aSpeed', new InstancedBufferAttribute(new Float32Array(cloudSpeed), 1))
  cloudGeo.setAttribute('aAlpha', new InstancedBufferAttribute(new Float32Array(cloudAlpha), 1))
  const cloudMat = new ShaderMaterial({
    uniforms: { uMap: { value: cloudTex }, uColor: { value: new Color() }, uShade: { value: new Color() }, uOpacity: { value: 1 }, uTime: { value: 0 }, uSpan: { value: 560 } },
    vertexShader: CLOUD_VERT,
    fragmentShader: CLOUD_FRAG,
    transparent: true,
    depthWrite: false,
    fog: false,
  })
  const clouds = new InstancedMesh(cloudGeo, cloudMat, cloudCount)
  for (let i = 0; i < cloudCount; i++) clouds.setMatrixAt(i, m4.identity())
  clouds.frustumCulled = false
  clouds.renderOrder = -8
  scene.add(clouds)
  disposables.push(cloudTex, cloudGeo, cloudMat)

  // ptáci ráno: hejno přeletí po obloze, mávají křídly
  const birdGeo = new BufferGeometry()
  birdGeo.setAttribute('position', new Float32BufferAttribute([-0.9, 0.25, 0, 0, 0, 0.12, 0, -0.06, 0, 0, 0, 0.12, 0.9, 0.25, 0, 0, -0.06, 0], 3))
  const birdMat = new MeshBasicMaterial({ color: '#4a4e5c', side: DoubleSide, fog: false, transparent: true })
  const BIRDS = high ? 14 : 8
  const birds = new InstancedMesh(birdGeo, birdMat, BIRDS)
  birds.frustumCulled = false
  const birdOff = Array.from({ length: BIRDS }, (_, i) => ({ x: (i % 5) * 2.2 + rnd() * 1.4, y: Math.abs((i % 5) - 2) * 0.8 + Math.floor(i / 5) * 1.6 + rnd() * 0.6, z: rnd() * 3, ph: rnd() * 6 }))
  scene.add(birds)
  disposables.push(birdGeo, birdMat)

  // kouř z komínů (večer): pár komínů ve střední vzdálenosti, každý souvislý sloupec hustých slabých částic
  const chim = data.chimneys
    .filter((c) => c[2] > -45 && c[2] < 12 && Math.abs(c[0]) < 45)
    .map((c) => ({ c, r: rnd() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, high ? 12 : 6)
  const PER = 16
  const smokeGeo = new BufferGeometry()
  smokeGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(chim.length * PER * 3), 3))
  smokeGeo.setAttribute('aBase', new Float32BufferAttribute(chim.flatMap(({ c }) => Array.from({ length: PER }, () => c).flat()), 3))
  smokeGeo.setAttribute('aPhase', new Float32BufferAttribute(chim.flatMap((_, k) => Array.from({ length: PER }, (_, i) => i / PER + k * 0.137)), 1))
  const smokeMat = new ShaderMaterial({ uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uColor: { value: new Color() }, uOpacity: { value: 0 } }, vertexShader: SMOKE_VERT, fragmentShader: SMOKE_FRAG, transparent: true, depthWrite: false, fog: false })
  const smoke = new Points(smokeGeo, smokeMat)
  smoke.frustumCulled = false
  scene.add(smoke)
  disposables.push(smokeGeo, smokeMat)

  // orb Aidy
  const orbMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmp: { value: 0.15 }, uBoost: { value: 1.5 }, uTint: { value: new Color('#ff8a4c') } },
    vertexShader: PASS_VERT,
    fragmentShader: ORB_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    depthWrite: false,
    fog: false,
  })
  const orbGeo = new PlaneGeometry(3.6, 3.6)
  const orb = new Mesh(orbGeo, orbMat)
  orb.position.set(ox, oy, oz)
  orb.renderOrder = 5
  scene.add(orb)
  // měkká záře na střeše pod orbem
  const poolMat = new MeshBasicMaterial({ map: contactTex, color: '#ff9a5a', transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0 })
  const pool = new Mesh(new PlaneGeometry(4.2, 4.2).rotateX(-Math.PI / 2), poolMat)
  pool.position.set(ox, data.aida.roof - 0.02, oz)
  scene.add(pool)
  disposables.push(orbMat, orbGeo, poolMat, pool.geometry)

  await yieldToMain()
  // ───────── Postprocess (jen desktop): bloom, jemný tilt-shift, vinětace ─────────
  let composer: EffectComposer | null = null
  const tiltPasses: ShaderPass[] = []
  let bloom: UnrealBloomPass | null = null
  if (high) {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new Vector2(256, 256), 0.2, 0.42, 0.86)
    composer.addPass(bloom)
    for (const horizontal of [true, false]) {
      const pass = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uAmount: { value: 0.001 }, uFocus: { value: 0.46 }, uBand: { value: 0.26 }, uH: { value: horizontal ? 1 : 0 }, uVignette: { value: 0.18 } }, vertexShader: PASS_VERT, fragmentShader: TILT_FRAG })
      composer.addPass(pass)
      tiltPasses.push(pass)
    }
    composer.addPass(new OutputPass())
  }

  // ───────── Kamera: trasa (M1: pomalý nálet k Aidině kanceláři) a myš ─────────
  const portrait = opts.portrait
  const route = portrait
    ? {
        pos: new CatmullRomCurve3([new Vector3(40, 24, 52), new Vector3(34, 15, 38), new Vector3(26, 7.5, 16)]),
        target: new CatmullRomCurve3([new Vector3(-1, 14, -6), new Vector3(6, 8, -10), new Vector3(16, 3.8, -14)]),
        fov: 50,
      }
    : {
        pos: new CatmullRomCurve3([new Vector3(...CAMERA.pos), new Vector3(46, 15, 46), new Vector3(30, 7, 16)]),
        target: new CatmullRomCurve3([new Vector3(...CAMERA.target), new Vector3(5, 6, -11), new Vector3(16, 3.6, -14)]),
        fov: CAMERA.fov,
      }
  camera.fov = route.fov
  let view = 0
  let viewTarget = 0
  const pointer = new Vector2()
  const look = new Vector2()
  const camPos = new Vector3()
  const camTarget = new Vector3()
  const helper = new Object3D()

  // ───────── Stav a smyčka ─────────
  let hour = 8
  let hourDirty = true
  let voice = 0
  let readVoice: (() => number) | null = null
  // úvod (preloader): -1 = neběží; jinak čas začátku v ms
  let introStart = -1
  let introHour = 0
  let time = 18 // ať je ve statickém snímku hejno ptáků na obloze
  let raf = 0
  let last = performance.now()
  let running = false
  const frames: number[] = []
  let slow = 0
  let fast = 0
  const sunV = new Vector3()
  const discV = new Vector3()
  const glass = new Color()
  const fogC = new Color()
  const lampC = new Color()
  const LAMP_OFF = new Color('#efe6d4')
  const LAMP_ON = new Color('#ffd99a').multiplyScalar(2.6)

  function applyHour() {
    const L = lightAt(hour)
    const night = smooth(19.2, 20.8, hour)
    sunDir(hour, sunV)
    discDir(hour, discV)
    const moon = hour < 6 || hour > 19.6
    fogC.copy(L.hor).lerp(L.top, 0.25)
    ;(scene.fog as Fog).color.copy(fogC)
    ;(scene.fog as Fog).far = 95 + 260 * (1 - L.fog * 0.6)
    hemi.color.copy(L.hs)
    hemi.groundColor.copy(L.hg)
    hemi.intensity = L.hi
    key.color.copy(L.sun)
    key.intensity = L.si
    key.position.copy(sunV).multiplyScalar(140).add(focus)
    const u = skyMat.uniforms
    u.uTop.value.copy(L.top)
    u.uHor.value.copy(L.hor)
    u.uFog.value.copy(fogC)
    u.uSun.value.copy(L.sun)
    u.uDisc.value.copy(discV)
    u.uGlowDir.value.copy(moon ? discV : sunV)
    u.uMoon.value = moon ? 1 : 0
    u.uLow.value = MathUtils.clamp(1 - sunV.y * 3, 0, 1)
    u.uShowDisc.value = hour >= 17.4 && hour <= 19.8 ? 1 : 0
    u.uNight.value = night
    u.uDeep.value = smooth(23.4, 24.8, hour)
    starMat.uniforms.uOpacity.value = L.stars * 0.95
    winMat.uniforms.uHour.value = hour
    winMat.uniforms.uNight.value = night
    winMat.uniforms.uGlass.value.copy(glass.copy(L.win))
    // oblaky: barva podle hodiny, spodek do barvy okolního světla
    cloudMat.uniforms.uColor.value.copy(L.cloud)
    cloudMat.uniforms.uShade.value.copy(L.cloud).lerp(L.hs, 0.55).multiplyScalar(0.92)
    cloudMat.uniforms.uOpacity.value = 0.95 - night * 0.62
    // lampy, orb, kouř, ptáci
    const lampsOn = smooth(18.4, 19.2, hour)
    lampMat.color.copy(lampC.copy(LAMP_OFF).lerp(LAMP_ON, lampsOn))
    for (const pl of nearLamps) pl.intensity = 7 * lampsOn * Math.max(0.5, night)
    orbLight.intensity = 5 + night * 16
    winLight.intensity = night * 20
    poolMat.opacity = 0.25 + night * 0.45
    orbMat.uniforms.uBoost.value = 1.45 + night * 0.25
    smokeMat.uniforms.uOpacity.value = smooth(16.2, 17.4, hour) * (1 - smooth(21.5, 22.5, hour)) * 0.85
    smokeMat.uniforms.uColor.value.copy(L.cloud).lerp(L.hs, 0.3)
    birdMat.opacity = smooth(6, 6.8, hour) * (1 - smooth(9.8, 10.6, hour))
    if (bloom) bloom.strength = 0.16 + night * 0.24
    hourDirty = false
  }

  // Úvod: 0–0,8 s město vyroste, 0,55–1,2 s vyjde slunce (hodina od svítání k cíli), naskočí stíny a orb.
  function stepIntro(now: number) {
    const t = (now - introStart) / 1000
    rise.value = 1.15 * smooth(0, 0.8, t)
    contactMat.opacity = smooth(0.4, 0.9, t)
    const sunK = smooth(0.55, 1.2, t)
    const target = introHour
    hour = 6.2 + (target - 6.2) * sunK
    hourDirty = true
    key.shadow.intensity = smooth(0.8, 1.2, t)
    orb.scale.setScalar(Math.max(0.001, smooth(0.85, 1.2, t)))
    pool.visible = t > 0.9
    if (t >= 1.2) {
      introStart = -1
      hour = target
      rise.value = 1.15
      contactMat.opacity = 1
      key.shadow.intensity = 1
      orb.scale.setScalar(1)
      pool.visible = true
    }
  }

  function updateCamera(dt: number) {
    // kamera dojíždí za cílem ze scrollu (~0,8 s), bez knihovny
    view += (viewTarget - view) * Math.min(1, dt * 3.2)
    look.x += (pointer.x - look.x) * Math.min(1, dt * 2.5)
    look.y += (pointer.y - look.y) * Math.min(1, dt * 2.5)
    route.pos.getPoint(view, camPos)
    route.target.getPoint(view, camTarget)
    camera.position.copy(camPos)
    camera.lookAt(camTarget)
    helper.quaternion.copy(camera.quaternion)
    camera.rotateY(-look.x * MathUtils.degToRad(2))
    camera.rotateX(-look.y * MathUtils.degToRad(1.4))
    orb.quaternion.copy(helper.quaternion)
  }

  function updateLife(dt: number) {
    time += dt
    skyMat.uniforms.uTime.value = time
    starMat.uniforms.uTime.value = time
    cloudMat.uniforms.uTime.value = time
    smokeMat.uniforms.uTime.value = time
    orbMat.uniforms.uTime.value = time
    if (readVoice) voice = readVoice()
    winMat.uniforms.uTime.value = time
    orbMat.uniforms.uAmp.value += (0.12 + voice * 0.6 - orbMat.uniforms.uAmp.value) * Math.min(1, dt * 8)
    orb.position.y = oy + Math.sin(time * 0.9) * 0.12
    if (birdMat.opacity > 0.01) {
      // hejno letí šikmo přes oblohu (smyčka 46 s)
      const k = (time % 46) / 46
      const base = new Vector3(-70 + k * 120, 30 + Math.sin(k * 6) * 2, 10 - k * 40)
      for (let i = 0; i < BIRDS; i++) {
        const o = birdOff[i]
        const flap = 0.6 + 0.4 * Math.sin(time * 9 + o.ph)
        helper.position.set(base.x + o.x, base.y + o.y, base.z + o.z)
        helper.lookAt(camera.position)
        helper.scale.set(0.9, flap, 0.9)
        helper.updateMatrix()
        birds.setMatrixAt(i, helper.matrix)
      }
      birds.instanceMatrix.needsUpdate = true
    }
  }

  function render() {
    renderer.info.reset()
    if (composer) composer.render()
    else renderer.render(scene, camera)
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    frames.push(dt * 1000)
    if (frames.length > 120) frames.shift()
    // adaptivní rozlišení: dlouhodobě pomalé snímky → nižší, rychlé → zpět výš (malé kroky, ať se neplýtvá realokacemi)
    if (dt > 0.024) slow++
    else if (dt < 0.0175) fast++
    if (slow > 40 && scale > 0.55) {
      scale = Math.max(0.55, scale - 0.15)
      applyScale()
      slow = fast = 0
    } else if (fast > 240 && scale < 1) {
      scale = Math.min(1, scale + 0.1)
      applyScale()
      slow = fast = 0
    }
    if (introStart >= 0) stepIntro(now)
    if (hourDirty) applyHour()
    updateCamera(dt)
    updateLife(dt)
    render()
  }

  let width = 1
  let height = 1
  function applyScale() {
    const pr = basePR * scale
    renderer.setPixelRatio(pr)
    renderer.setSize(width, height, false)
    composer?.setPixelRatio(pr)
    composer?.setSize(width, height)
    starMat.uniforms.uPx.value = pr
    smokeMat.uniforms.uPx.value = pr
    for (const t of tiltPasses) t.uniforms.uAmount.value = 1 / (t.uniforms.uH.value > 0.5 ? width : height)
  }

  // shadery na pozadí (paralelní kompilace), první snímek pak nečeká
  camera.position.set(...CAMERA.pos)
  camera.lookAt(new Vector3(...CAMERA.target))
  await renderer.compileAsync(scene, camera).catch(() => {})
  await yieldToMain()

  const controller: CityController = {
    setHour(h) {
      if (introStart >= 0) {
        introHour = h
        return
      }
      if (Math.abs(h - hour) > 1e-4) {
        hour = h
        hourDirty = true
      }
    },
    setView(t) {
      viewTarget = MathUtils.clamp(t, 0, 1)
    },
    setPointer(x, y) {
      pointer.set(x, y)
    },
    setVoice(level) {
      voice = level
    },
    setVoiceSource(read) {
      readVoice = read
    },
    playIntro() {
      introHour = hour
      introStart = performance.now()
      rise.value = 0
      contactMat.opacity = 0
      key.shadow.intensity = 0
      orb.scale.setScalar(0.001)
      pool.visible = false
      hour = 6.2
      hourDirty = true
    },
    setSize(w, h) {
      width = Math.max(1, w)
      height = Math.max(1, h)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      applyScale()
    },
    start() {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
    },
    renderOnce() {
      view = viewTarget
      if (hourDirty) applyHour()
      updateCamera(1)
      updateLife(0)
      render()
    },
    stats() {
      const sorted = [...frames].sort((a, b) => a - b)
      const avg = frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length)
      const gl = renderer.getContext()
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      return {
        fps: avg ? 1000 / avg : 0,
        worst: sorted.at(-1) ?? 0,
        calls: renderer.info.render.calls,
        tris: renderer.info.render.triangles,
        pixelRatio: renderer.getPixelRatio(),
        scale,
        quality,
        renderer: ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'WebGL',
      }
    },
    dispose() {
      controller.stop()
      for (const d of disposables) d.dispose()
      composer?.dispose()
      renderer.dispose()
    },
  }
  return controller
}
