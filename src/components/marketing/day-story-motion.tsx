'use client'

import { useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { buildCity } from '@/lib/marketing/city'
import { STORY_CALLS } from '@/lib/marketing/story'
import { cn } from '@/lib/utils'
import { IconCheck, IconPhone } from './icons'
import { INDUSTRY_META } from './industry'
import { playSound, type MicroSound } from './micro-sounds'
import { onLenis } from './smooth-scroll'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// „24 hodin s Aidou“: připnutá scéna, scroll posouvá čas od 08:00 do 02:00.
// Timeline animuje jen čas (minuty) a karty hovorů; světlo, hodiny, slunce, měsíc,
// okna města a počítadlo se z času dopočítají v každém snímku (render()).

const START = 8 * 60
const END = 26 * 60 // 02:00 dalšího dne
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const v = h * 60 + m
  return v < START ? v + 24 * 60 : v
}
const fmt = (m: number) => {
  const v = Math.floor(m) % (24 * 60)
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}

// Světlo dne podle času: pozadí, město, nerozsvícená okna. Odpoledne → západ slunce → modrá hodina → noc,
// aby každá část večera měla vlastní barvu (lineární přechod oranžová → noc by 16:30 a 18:00 slil).
const KEYS: { m: number; bg: string; city: string; win: string }[] = [
  { m: START, bg: '#fff6ec', city: '#ecdcc6', win: '#f7eee2' },
  { m: 12 * 60 + 30, bg: '#f6e9d7', city: '#e3ccaf', win: '#efe0cb' },
  { m: 15 * 60, bg: '#f4d2a6', city: '#d9ab7e', win: '#ebc597' },
  { m: 17 * 60, bg: '#f2a65a', city: '#b8693a', win: '#cc8350' },
  { m: 18 * 60 + 30, bg: '#e2714c', city: '#7e3426', win: '#9a4632' },
  { m: 19 * 60 + 30, bg: '#4a3b6e', city: '#1c1738', win: '#2a2350' },
  { m: 21 * 60, bg: '#18224a', city: '#0a1030', win: '#141c42' },
  { m: END, bg: '#0e1630', city: '#060a1d', win: '#0f1636' },
]

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const KEY_RGB = KEYS.map((k) => ({ m: k.m, bg: hexToRgb(k.bg), city: hexToRgb(k.city), win: hexToRgb(k.win) }))
function lightAt(m: number) {
  let i = 0
  while (i < KEY_RGB.length - 2 && m > KEY_RGB[i + 1].m) i++
  const a = KEY_RGB[i]
  const b = KEY_RGB[i + 1]
  const k = Math.min(1, Math.max(0, (m - a.m) / (b.m - a.m)))
  const lerp = (x: number[], y: number[]) => x.map((v, j) => Math.round(v + (y[j] - v) * k))
  const css = (c: number[]) => `rgb(${c.join(' ')})`
  const bg = lerp(a.bg, b.bg)
  return { bg: css(bg), bgRgb: bg, city: css(lerp(a.city, b.city)), win: css(lerp(a.win, b.win)) }
}

// Tón textu podle skutečného jasu pozadí (WCAG): tmavý inkoust, nebo světlý měsíc, co má vyšší kontrast.
const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const L_INK = luminance([20, 22, 31])
const L_MOON = luminance([237, 235, 245])
const toneFor = (rgb: number[]) => {
  const l = luminance(rgb)
  return (l + 0.05) / (L_INK + 0.05) >= (L_MOON + 0.05) / (l + 0.05) ? 'light' : 'dark'
}

const STARS = Array.from({ length: 34 }, (_, i) => ({ x: (i * 37.3) % 100, y: (i * 17.9) % 52, s: 1 + (i % 3) }))

export default function DayStoryMotion() {
  const t = useTranslations('marketing.story')
  const tc = useTranslations('marketing.common')
  const td = useTranslations('marketing.demo')
  const city = useMemo(buildCity, [])
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const el = root.current!
      const q = <T extends Element>(sel: string) => [...el.querySelectorAll<T>(sel)]
      const stage = el.querySelector<HTMLElement>('[data-stage]')!
      const clock = el.querySelector<HTMLElement>('[data-clock]')!
      const phoneClock = el.querySelector<HTMLElement>('[data-phone-clock]')!
      const chipCount = el.querySelector<HTMLElement>('[data-chip-count]')!
      const sun = el.querySelector<HTMLElement>('[data-sun]')!
      const moon = el.querySelector<HTMLElement>('[data-moon]')!
      const stars = el.querySelector<HTMLElement>('[data-stars]')!
      const slot = el.querySelector<HTMLElement>('[data-card-slot]')!
      const phoneTarget = el.querySelector<HTMLElement>('[data-phone-target]')!
      const wins = q<SVGRectElement>('[data-win]')
      const cards = q<HTMLElement>('[data-card]')
      const scenes = q<HTMLElement>('[data-scene]')
      const notifs = q<HTMLElement>('[data-notif]')
      const finale = el.querySelector<HTMLElement>('[data-finale]')!
      const content = el.querySelector<HTMLElement>('[data-content]')!
      const halo = el.querySelector<SVGElement>('[data-halo]')!
      const horizon = el.querySelector<HTMLElement>('[data-horizon]')!
      const glows = q<SVGRectElement>('[data-glow]')
      const beam = el.querySelector<HTMLElement>('[data-beam]')!
      const aidaLabel = el.querySelector<HTMLElement>('[data-aida-label]')!
      const aidaRect = el.querySelector<SVGRectElement>('.story-win-aida')!
      const phone = el.querySelector<HTMLElement>('[data-phone]')!

      ScrollTrigger.config({ ignoreMobileResize: true })
      const time = { m: START }
      const doneAt: number[] = []
      let lastClock = ''
      let lastTone = ''
      let lastCount = -1

      gsap.set(cards, { opacity: 0, y: 70, rotate: -3, scale: 0.96 })
      gsap.set(scenes, { opacity: 0, y: 26 })
      gsap.set(notifs, { opacity: 0, y: -14 })
      gsap.set(finale, { opacity: 0, y: 30 })
      cards.forEach((c) => {
        gsap.set(c.querySelectorAll('[data-pill]'), { opacity: (i) => (i === 0 ? 1 : 0) })
        gsap.set(c.querySelector('[data-summary]'), { opacity: 0, y: 10 })
        gsap.set(c.querySelector('[data-bars]'), { opacity: 0 })
      })

      // Kam karta odletí: do horní části displeje telefonu (středy, bez vlivu transformací).
      const flight = () => {
        const s = slot.getBoundingClientRect()
        const p = phoneTarget.getBoundingClientRect()
        return { x: p.left + p.width / 2 - (s.left + s.width / 2), y: p.top + p.height / 2 - (s.top + s.height / 2) }
      }
      const notifStep = () => Math.max(...notifs.map((n) => n.offsetHeight), 40) + (window.innerWidth < 768 ? 5 : 8)
      const maxStack = () => (window.innerWidth < 768 ? 1 : 2)

      // mikrozvuky (jsou-li zapnuté) jen při posunu dopředu
      let dir = 1
      const cue = (name: MicroSound) => () => dir > 0 && playSound(name)

      const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true })
      let prevMin = START
      STORY_CALLS.forEach((call, i) => {
        const m = toMin(call.time)
        const card = cards[i]
        const label = `c${i}`
        // čas doběhne k hovoru (delší úseky dne rychleji, ale každý hovor má stejný prostor)
        tl.to(time, { m, duration: Math.min(1.3, Math.max(0.45, (m - prevMin) / 220)) }, i === 0 ? 0.2 : '>')
        tl.addLabel(label)
        if (i > 0) tl.to(scenes[i - 1], { opacity: 0, y: -18, duration: 0.2 }, `c${i - 1}+=2.15`)
        tl.to(scenes[i], { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, `${label}-=0.2`)
        // příchozí hovor: karta přijede a „zavibruje“
        tl.to(card, { opacity: 1, y: 0, rotate: 0, scale: 1, duration: 0.35, ease: 'back.out(1.4)' }, label)
        tl.call(cue('ring'), undefined, `${label}+=0.05`)
        tl.to(card, { keyframes: { x: [0, -7, 7, -5, 5, -2, 0] }, duration: 0.3 }, `${label}+=0.1`)
        tl.fromTo(card.querySelector('[data-ring]'), { opacity: 0.7, scale: 1 }, { opacity: 0, scale: 1.12, duration: 0.45 }, `${label}+=0.05`)
        // Aida mluví
        const pills = card.querySelectorAll('[data-pill]')
        tl.to(pills[0], { opacity: 0, duration: 0.1 }, `${label}+=0.6`)
        tl.to(pills[1], { opacity: 1, duration: 0.1 }, `${label}+=0.6`)
        tl.to(card.querySelector('[data-bars]'), { opacity: 1, duration: 0.15 }, `${label}+=0.6`)
        tl.to(time, { m: m + 2, duration: 0.5 }, `${label}+=0.6`)
        // vyřízeno: shrnutí
        tl.to(pills[1], { opacity: 0, duration: 0.1 }, `${label}+=1.1`)
        tl.to(pills[2], { opacity: 1, duration: 0.1 }, `${label}+=1.1`)
        tl.to(card.querySelector('[data-bars]'), { opacity: 0, duration: 0.1 }, `${label}+=1.1`)
        tl.to(card.querySelector('[data-summary]'), { opacity: 1, y: 0, duration: 0.25, ease: 'power3.out' }, `${label}+=1.1`)
        // shrnutí odletí do telefonu majitele, tam se objeví notifikace
        tl.to(card, { x: () => flight().x, y: () => flight().y, scale: 0.16, opacity: 0, rotate: 4, duration: 0.45, ease: 'power2.in' }, `${label}+=1.55`)
        notifs.slice(0, i).forEach((n, k) => {
          const depth = i - k
          // na mobilu se do telefonu vejdou dvě notifikace, na desktopu tři
          tl.to(n, { y: () => depth * notifStep(), opacity: () => (depth > maxStack() ? 0 : 1 - depth * 0.15), duration: 0.2 }, `${label}+=1.9`)
        })
        tl.to(notifs[i], { opacity: 1, y: 0, duration: 0.2, ease: 'power3.out' }, `${label}+=1.95`)
        tl.call(cue('ding'), undefined, `${label}+=1.95`)
        doneAt.push(tl.duration())
        prevMin = m + 2
      })
      // závěr: čas doběhne, zbývá jen Aidino okno a počítadlo
      tl.to(time, { m: Math.max(END, prevMin) + 1, duration: 0.4 }, '>')
      tl.to(scenes[scenes.length - 1], { opacity: 0, y: -18, duration: 0.25 }, '>-0.1')
      tl.to(content, { opacity: 0, y: -30, duration: 0.35 }, '<')
      tl.fromTo(phone, { filter: 'brightness(1) saturate(1)' }, { filter: 'brightness(0.42) saturate(0.6)', duration: 0.35 }, '<')
      tl.addLabel('finale', '<0.1')
      tl.to(finale, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 'finale')
      tl.fromTo(beam, { opacity: 0, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.55, ease: 'power2.out' }, 'finale+=0.1')
      tl.to(halo, { attr: { r: 230 }, duration: 0.6, ease: 'power2.out' }, 'finale')
      tl.fromTo(aidaLabel, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, 'finale+=0.35')
      tl.to({}, { duration: 0.9 })

      // Paprsek a štítek se zarovnají na Aidino okno (poloha závisí na šířce okna a ořezu města).
      const layoutFinale = () => {
        const st = stage.getBoundingClientRect()
        const win = aidaRect.getBoundingClientRect()
        const text = finale.getBoundingClientRect()
        const cx = win.left + win.width / 2 - st.left
        const top = text.bottom - st.top - (Number(gsap.getProperty(finale, 'y')) || 0) + 18
        const bottom = win.top - st.top - 6
        beam.style.left = `${cx}px`
        beam.style.top = `${top}px`
        beam.style.height = `${Math.max(0, bottom - top)}px`
        aidaLabel.style.left = `${cx}px`
        aidaLabel.style.top = `${win.top - st.top - 34}px`
      }
      layoutFinale()
      ScrollTrigger.addEventListener('refreshInit', layoutFinale)
      ScrollTrigger.addEventListener('refresh', layoutFinale)

      const render = () => {
        const m = time.m
        const light = lightAt(m)
        stage.style.setProperty('--st-bg', light.bg)
        stage.style.setProperty('--st-city', light.city)
        stage.style.setProperty('--st-win', light.win)
        const tone = toneFor(light.bgRgb)
        if (tone !== lastTone) {
          lastTone = tone
          stage.dataset.tone = tone
          stage.style.setProperty('--st-fg', tone === 'dark' ? '#edebf5' : '#14161f')
          // malé popisky mají vlastní podklad, aby držely kontrast AA i na oranžovém západu
          stage.style.setProperty('--st-fg-soft', tone === 'dark' ? '#d4d6e8' : '#2c2e3a')
          stage.style.setProperty('--st-pill', tone === 'dark' ? 'rgb(6 9 26 / 0.5)' : 'rgb(255 255 255 / 0.6)')
        }
        // růžová záře nad obzorem při západu slunce (vrchol 18:30)
        horizon.style.opacity = String(Math.max(0, 1 - Math.abs(m - (18 * 60 + 30)) / 75))
        const label = fmt(m)
        if (label !== lastClock) {
          lastClock = label
          clock.textContent = label
          phoneClock.textContent = label
        }
        // slunce po oblouku 08:00–19:30, měsíc 19:30–02:00, hvězdy v noci
        const w = stage.clientWidth
        const h = stage.clientHeight
        const s = (m - 7 * 60) / (12.5 * 60)
        sun.style.opacity = String(Math.max(0, Math.min(1, Math.min(s * 6, (1 - s) * 5))))
        sun.style.transform = `translate3d(${(0.06 + 0.82 * s) * w}px, ${(0.58 - Math.sin(Math.PI * s) * 0.48) * h}px, 0)`
        const r = (m - (19 * 60 + 30)) / (6.5 * 60)
        moon.style.opacity = String(Math.max(0, Math.min(1, r * 5)))
        // měsíc vychází vpravo a drží se mimo text (na mobilu mezi scénou a kartou, na desktopu nad telefonem)
        const rr = Math.min(Math.max(r, 0), 1)
        const narrow = w < 768
        moon.style.transform = narrow
          ? `translate3d(${(0.9 - 0.03 * rr) * w}px, ${(0.42 + 0.05 * rr) * h}px, 0)`
          : `translate3d(${(0.91 - 0.05 * rr) * w}px, ${(0.42 - 0.28 * Math.sin(Math.PI * rr * 0.6)) * h}px, 0)`
        const night = Math.max(0, Math.min(1, (m - (19 * 60 + 40)) / 70))
        stars.style.opacity = String(night)
        // Aidino okno: v noci, kdy ostatní zhasnou, kolem něj zesílí teplá záře
        halo.style.opacity = String(Math.max(0, Math.min(1, (m - 22 * 60) / 180)) * 0.9 + night * 0.1)
        for (let i = 0; i < wins.length; i++) {
          const win = city.windows[i]
          const on = String(win.aida || (m >= win.on && m < win.off))
          if (wins[i].dataset.on !== on) {
            wins[i].dataset.on = on
            glows[i].dataset.on = on
          }
        }
        const now = tl.time()
        const count = doneAt.filter((d) => now >= d - 0.05).length
        if (count !== lastCount) {
          lastCount = count
          chipCount.textContent = String(count)
        }
      }
      tl.eventCallback('onUpdate', render)
      render()

      // Scéna drží v obraze přes CSS sticky (výška kořene = obrazovka + délka příběhu), ne přes pin:
      // přepnutí na position: fixed by Chrome započítal jako posun layoutu (CLS).
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.7,
        animation: tl,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          dir = self.direction
        },
      })

      // Lenis a ScrollTrigger: aktualizace při každém plynulém posunu
      let unsub: (() => void) | undefined
      const off = onLenis((lenis) => {
        unsub?.()
        unsub = lenis?.on('scroll', ScrollTrigger.update)
      })
      return () => {
        off()
        unsub?.()
        ScrollTrigger.removeEventListener('refreshInit', layoutFinale)
        ScrollTrigger.removeEventListener('refresh', layoutFinale)
        st.kill()
      }
    },
    { scope: root }
  )

  const handledText = t('handled', { count: STORY_CALLS.length })
  const aidaWindow = city.windows.find((w) => w.aida)

  return (
    // 650 / 750 % výšky obrazovky je délka příběhu (mobil / desktop), plus jedna obrazovka scény
    <div ref={root} className="relative h-[750svh] md:h-[850svh]">
      {/* Přístupná podoba příběhu; vizuální scéna je pro čtečky skrytá. */}
      <ol className="sr-only">
        {STORY_CALLS.map((call) => (
          <li key={call.id}>
            <time dateTime={call.time}>{call.time}</time> {t(`calls.${call.id}.scene`)} {t(`calls.${call.id}.business`)}:{' '}
            {tc('quote', { text: t(`calls.${call.id}.reason`) })} {t('summary')}: {t(`calls.${call.id}.result`)}.
          </li>
        ))}
        <li>
          {handledText} {t('missed')}
        </li>
      </ol>

      <div
        data-stage
        data-tone="light"
        aria-hidden
        className="sticky top-0 h-[100svh] overflow-hidden"
        style={{ backgroundColor: 'var(--st-bg)', color: 'var(--st-fg)', '--st-bg': '#fff6ec', '--st-fg': '#14161f', '--st-fg-soft': '#2c2e3a', '--st-pill': 'rgb(255 255 255 / 0.6)' } as React.CSSProperties}
      >
        {/* Obloha: záře západu slunce nad obzorem */}
        <div data-horizon className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(ellipse_80%_70%_at_50%_100%,rgb(255_150_120/0.75),rgb(255_120_120/0.25)_45%,transparent_75%)] opacity-0" />
        <div data-stars className="pointer-events-none absolute inset-0 opacity-0">
          {STARS.map((s, i) => (
            <span key={i} className="absolute rounded-full bg-moon" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: 0.35 + (i % 4) * 0.15 }} />
          ))}
        </div>
        <div data-sun className="pointer-events-none absolute left-0 top-0 -ml-[16vmin] -mt-[16vmin] size-[32vmin] rounded-full bg-[radial-gradient(circle,rgb(255_251_240/0.95)_0%,rgb(255_220_160/0.55)_32%,transparent_68%)] will-change-transform" />
        <div data-moon className="pointer-events-none absolute left-0 top-0 -ml-[5vmin] -mt-[5vmin] size-[10vmin] rounded-full bg-[radial-gradient(circle_at_38%_35%,#fbfaff,#d9d6ea_60%,#b9b5d2)] opacity-0 shadow-[0_0_60px_14px_rgb(237_235_245/0.18)] will-change-transform" />

        {/* Město: večer se rozsvěcuje, v noci zhasíná, Aidino okno svítí pořád */}
        <svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" overflow="visible" className="pointer-events-none absolute inset-x-0 bottom-0 h-[20svh] w-full overflow-visible md:h-[30svh]">
          <g style={{ fill: 'var(--st-city)' }}>
            {city.buildings.map((b, i) => (
              <rect key={i} x={b.x} y={260 - b.h} width={b.w} height={b.h} />
            ))}
          </g>
          <defs>
            <radialGradient id="story-aida-glow">
              <stop offset="0" stopColor="#ff9a5a" stopOpacity="0.85" />
              <stop offset="0.35" stopColor="#ff8a4c" stopOpacity="0.35" />
              <stop offset="1" stopColor="#ff8a4c" stopOpacity="0" />
            </radialGradient>
          </defs>
            <filter id="story-win-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          {aidaWindow && <circle data-halo cx={aidaWindow.x + 6} cy={aidaWindow.y + 8} r={110} fill="url(#story-aida-glow)" opacity={0} />}
          {/* záře rozsvícených oken (rozmazaná kopie; filtr se přepočítá jen když se okno rozsvítí/zhasne) */}
          <g filter="url(#story-win-glow)">
            {city.windows.map((w, i) => (
              <rect key={i} data-glow data-on="false" x={w.x - 2} y={w.y - 2} width={14} height={18} className="story-glow" />
            ))}
          </g>
          {city.windows.map((w, i) => (
            <rect
              key={i}
              data-win
              data-on="false"
              x={w.aida ? w.x - 1 : w.x}
              y={w.aida ? w.y - 2 : w.y}
              width={w.aida ? 13 : 10}
              height={w.aida ? 18 : 14}
              rx={1.5}
              className={cn('story-win', `story-win-h${w.hue}`, w.aida && 'story-win-aida')}
            />
          ))}
        </svg>

        <div data-content className="mk-container relative grid h-full grid-rows-[auto_1fr] gap-3 pb-[21svh] pt-[5rem] md:grid-cols-[1.05fr_1fr] md:grid-rows-1 md:items-center md:gap-10 md:pb-[30svh] md:pt-24">
          <div className="relative flex min-w-0 flex-col gap-3 md:gap-6">
            <div className="flex flex-wrap items-center gap-2 text-[0.75rem] md:text-[0.8125rem]" style={{ color: 'var(--st-fg-soft)' }}>
              <span className="mk-mono rounded-full px-2.5 py-0.5 uppercase tracking-[0.08em]" style={{ background: 'var(--st-pill)' }}>
                {t('note')}
              </span>
              <span className="mk-mono whitespace-nowrap rounded-full px-2.5 py-0.5 tabular-nums" style={{ background: 'var(--st-pill)' }}>
                {t('chipHandled')} <span data-chip-count>0</span> · {t('chipMissed')} 0
              </span>
            </div>
            <p data-clock className="mk-mono text-[clamp(4.5rem,13vw,11.5rem)] font-medium leading-[0.9] tracking-[-0.05em]">
              08:00
            </p>
            <div className="relative min-h-[5.5rem] md:min-h-[8rem]">
              {STORY_CALLS.map((call) => (
                <p key={call.id} data-scene className="mk-display mk-h3 absolute inset-x-0 top-0 max-w-[22ch]">
                  {t(`calls.${call.id}.scene`)}
                </p>
              ))}
            </div>
          </div>

          <div data-card-slot className="relative mx-auto h-[14rem] w-full max-w-[24rem] self-center md:h-[17rem] md:max-w-[26rem]">
            {STORY_CALLS.map((call) => (
              <StoryCard
                key={call.id}
                industry={call.industry}
                time={call.time}
                business={t(`calls.${call.id}.business`)}
                number={call.number ?? t('hiddenNumber')}
                reason={tc('quote', { text: t(`calls.${call.id}.reason`) })}
                result={t(`calls.${call.id}.result`)}
                status={[t('status.incoming'), t('status.talking'), t('status.done')]}
              />
            ))}
          </div>
        </div>

        {/* Telefon majitele */}
        <div data-phone className="absolute bottom-[3svh] right-[var(--mk-gutter)] w-[6.75rem] md:bottom-[6svh] md:w-[12.5rem]">
          <p className="mk-mono mb-2 hidden text-right text-[0.6875rem] uppercase tracking-[0.08em] md:block" style={{ color: 'var(--st-fg-soft)' }}>
            {t('phoneTitle')}
          </p>
          <div className="aspect-[9/18] rounded-[1.4rem] bg-[#0a0e1d] p-1.5 shadow-[0_30px_60px_-24px_rgb(0_0_0/0.55)] ring-1 ring-white/10 md:rounded-[2rem] md:p-2">
            <div className="relative h-full overflow-hidden rounded-[1.1rem] bg-[linear-gradient(170deg,#24305f,#101733_60%,#0b1026)] md:rounded-[1.6rem]">
              <p data-phone-clock className="mk-mono pt-4 text-center text-[1.35rem] font-medium tracking-[-0.03em] text-moon md:pt-7 md:text-[2.4rem]">
                08:00
              </p>
              <div data-phone-target className="relative mx-1.5 mt-2 h-[62%] md:mx-2 md:mt-4 md:h-[55%]">
                {STORY_CALLS.map((call) => {
                  // „Nová rezervace: pátek 19:00, 6 osob“ → titulek a detail
                  const [title, ...rest] = t(`calls.${call.id}.notif`).split(/:\s/)
                  const { Icon, tint } = INDUSTRY_META[call.industry]
                  return (
                    <div key={call.id} data-notif className="absolute inset-x-0 top-0 rounded-[0.65rem] bg-moon/95 px-1.5 py-1.5 text-ink md:rounded-xl md:px-2.5 md:py-2">
                      <p className="flex items-center gap-1 text-[0.5rem] leading-none text-ink-soft md:text-[0.625rem]">
                        <span className="flex size-3 shrink-0 items-center justify-center rounded-[3px] md:size-4" style={{ backgroundColor: tint, color: '#fff' }}>
                          <Icon size={9} strokeWidth={2} />
                        </span>
                        <span className="hidden truncate font-semibold text-ink md:inline">{t(`calls.${call.id}.business`)}</span>
                        <span className="mk-mono ml-auto shrink-0">{call.time}</span>
                      </p>
                      <p className="mt-1 line-clamp-2 text-[0.5625rem] font-semibold leading-tight md:truncate md:text-[0.75rem]">{title}</p>
                      {rest.length > 0 && <p className="line-clamp-3 text-[0.5625rem] leading-tight text-ink-soft md:line-clamp-2 md:text-[0.6875rem]">{rest.join(': ')}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Závěr: velké finále a paprsek světla z Aidina okna */}
        <div data-beam className="pointer-events-none absolute w-0 origin-bottom opacity-0">
          <span className="absolute inset-y-0 left-1/2 w-[9rem] -translate-x-1/2 bg-[linear-gradient(to_top,rgb(255_138_76/0.42),rgb(255_138_76/0.12)_55%,transparent)] blur-xl" />
          <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[linear-gradient(to_top,#ffb37f,rgb(255_179_127/0.35)_70%,transparent)]" />
        </div>
        <div data-aida-label className="pointer-events-none absolute flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-aida px-2.5 py-1 text-xs font-semibold text-ink opacity-0 shadow-[0_0_24px_rgb(255_138_76/0.7)]">
          <span className="size-1.5 rounded-full bg-ink" />
          {td('aida')}
        </div>
        <div data-finale className="pointer-events-none absolute inset-x-0 top-[13svh] text-center md:top-[11svh]">
          <div className="mk-container flex flex-col items-center">
            <p className="mk-display max-w-[16ch] text-[clamp(2.6rem,7.2vw,6.5rem)] text-moon">{handledText}</p>
            <p className="mk-display mt-3 text-[clamp(2.6rem,7.2vw,6.5rem)] text-aida [text-shadow:0_0_42px_rgb(255_138_76/0.55),0_0_90px_rgb(255_138_76/0.3)]">
              {t('missed')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Karta hovoru ve scéně: tři stavy (příchozí → Aida mluví → vyřízeno) jsou v DOM najednou a přepínají se. */
function StoryCard({
  industry,
  time,
  business,
  number,
  reason,
  result,
  status,
}: {
  industry: keyof typeof INDUSTRY_META
  time: string
  business: string
  number: string
  reason: string
  result: string
  status: [string, string, string]
}) {
  const { Icon, tint } = INDUSTRY_META[industry]
  const pill = 'absolute left-0 top-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold'
  return (
    <article data-card className="absolute inset-x-0 top-0 rounded-[1.25rem] bg-white p-4 text-ink md:rounded-[1.5rem] md:p-5 shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_30px_70px_-30px_rgb(14_22_48/0.6)] ring-1 ring-ink/8 will-change-transform">
      <span data-ring className="pointer-events-none absolute -inset-1 rounded-[1.75rem] border-2 border-caller opacity-0" />
      <header className="flex items-center justify-between gap-3">
        <span className="relative h-6 w-40">
          <span data-pill className={cn(pill, 'bg-caller/15 text-[#1f4f9a]')}>
            <IconPhone size={14} />
            {status[0]}
          </span>
          <span data-pill className={cn(pill, 'bg-aida/15 text-[#9a3a10]')}>
            <span data-bars className="story-bars" aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </span>
            {status[1]}
          </span>
          <span data-pill className={cn(pill, 'bg-ok/15 text-[#1c6b45]')}>
            <IconCheck size={14} />
            {status[2]}
          </span>
        </span>
        <span className="mk-mono text-sm text-ink-soft">{time}</span>
      </header>
      <div className="mt-3 flex items-center gap-3 md:mt-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}26`, color: tint }}>
          <Icon size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{business}</p>
          <p className="mk-mono truncate text-[0.8125rem] text-ink-soft">{number}</p>
        </div>
      </div>
      <p className="mt-3 text-[0.9375rem] leading-snug md:mt-4 md:text-[1.0625rem]">{reason}</p>
      <div data-summary className="mt-3 flex items-start gap-2.5 rounded-xl bg-ok/10 px-3 py-2.5 text-[0.875rem] leading-snug md:mt-4 md:px-3.5 md:py-3 md:text-[0.9375rem]">
        <IconCheck size={18} className="mt-0.5 shrink-0 text-[#1c6b45]" />
        <p>{result}</p>
      </div>
    </article>
  )
}
