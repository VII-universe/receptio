'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { STORY_CALLS } from '@/lib/marketing/story'
import { cn } from '@/lib/utils'
import { getCity } from './city/bus'
import type { Signal } from './city/scene'
import { IconCheck, IconPhone } from './icons'
import { INDUSTRY_META } from './industry'
import { playSound, type MicroSound } from './micro-sounds'
import { onLenis } from './smooth-scroll'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// „24 hodin s Aidou“ ve 3D: připnutá vrstva nad 3D městem (city-backdrop.tsx), scroll posouvá čas od 08:00
// do 02:00 a pak do svítání. Timeline animuje čas (minuty), karty hovorů a signály; kameru po městě, světlo dne,
// okna a život ve městě počítá 3D scéna z času (render() jí ho předá přes bus.ts).

const START = 8 * 60
const END = 26 * 60 // 02:00 dalšího dne
const DAWN = 30.5 * 60 // svítání 06:30
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const v = h * 60 + m
  return v < START ? v + 24 * 60 : v
}
const fmt = (m: number) => {
  const v = Math.floor(m) % (24 * 60)
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}

// Tón popisků podle nebe: tmavé písmo přes den, světlé od soumraku do svítání.
const TONES = {
  light: { fg: '#14161f', soft: '#2c2e3a', pill: 'rgb(255 248 240 / 0.8)' },
  dark: { fg: '#edebf5', soft: '#d4d6e8', pill: 'rgb(8 12 32 / 0.58)' },
}
const toneAt = (m: number) => (m >= 19.3 * 60 && m < 29.9 * 60 ? 'dark' : 'light')

export default function DayStoryMotion() {
  const t = useTranslations('marketing.story')
  const tc = useTranslations('marketing.common')
  const td = useTranslations('marketing.demo')
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const el = root.current!
      const q = <T extends Element>(sel: string) => [...el.querySelectorAll<T>(sel)]
      const stage = el.querySelector<HTMLElement>('[data-stage]')!
      const clock = el.querySelector<HTMLElement>('[data-clock]')!
      const phoneClock = el.querySelector<HTMLElement>('[data-phone-clock]')!
      const chipCount = el.querySelector<HTMLElement>('[data-chip-count]')!
      const slot = el.querySelector<HTMLElement>('[data-card-slot]')!
      const phoneTarget = el.querySelector<HTMLElement>('[data-phone-target]')!
      const cards = q<HTMLElement>('[data-card]')
      const scenes = q<HTMLElement>('[data-scene]')
      const notifs = q<HTMLElement>('[data-notif]')
      const finale = el.querySelector<HTMLElement>('[data-finale]')!
      const hud = el.querySelector<HTMLElement>('[data-hud]')!
      const beam = el.querySelector<HTMLElement>('[data-beam]')!
      const aidaLabel = el.querySelector<HTMLElement>('[data-aida-label]')!
      const phone = el.querySelector<HTMLElement>('[data-phone]')!

      ScrollTrigger.config({ ignoreMobileResize: true })
      const time = { m: START }
      const voice = { v: 0 }
      const sig = STORY_CALLS.map(() => ({ p: 0, q: 0 }))
      const doneAt: number[] = []
      let lastClock = ''
      let lastTone = ''
      let lastCount = -1
      let active = false

      gsap.set(cards, { opacity: 0, y: 70, rotate: -3, scale: 0.96 })
      gsap.set(scenes, { opacity: 0, y: 18 })
      gsap.set(notifs, { opacity: 0, y: -14 })
      gsap.set([finale, aidaLabel], { opacity: 0, y: 24 })
      gsap.set(beam, { opacity: 0, scaleY: 0 })
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
        // čas doběhne k hovoru; mezi zastávkami je let kamery bez textu, proto delší úseky
        tl.to(time, { m, duration: Math.min(1.6, Math.max(0.55, (m - prevMin) / 170)) }, i === 0 ? 0.2 : '>')
        tl.addLabel(label)
        if (i > 0) tl.to(scenes[i - 1], { opacity: 0, y: -12, duration: 0.2 }, `c${i - 1}+=2.15`)
        tl.to(scenes[i], { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, `${label}-=0.15`)
        // příchozí hovor: světelný signál vyletí z budovy k Aidě, karta přijede a „zavibruje“
        tl.to(sig[i], { p: 1, duration: 0.6, ease: 'power1.inOut' }, `${label}-=0.05`)
        tl.to(card, { opacity: 1, y: 0, rotate: 0, scale: 1, duration: 0.35, ease: 'back.out(1.4)' }, label)
        tl.call(cue('ring'), undefined, `${label}+=0.05`)
        tl.to(card, { keyframes: { x: [0, -7, 7, -5, 5, -2, 0] }, duration: 0.3 }, `${label}+=0.1`)
        tl.fromTo(card.querySelector('[data-ring]'), { opacity: 0.7, scale: 1 }, { opacity: 0, scale: 1.12, duration: 0.45 }, `${label}+=0.05`)
        // Aida mluví (orb nad kanceláří se rozvlní)
        const pills = card.querySelectorAll('[data-pill]')
        tl.to(pills[0], { opacity: 0, duration: 0.1 }, `${label}+=0.6`)
        tl.to(pills[1], { opacity: 1, duration: 0.1 }, `${label}+=0.6`)
        tl.to(card.querySelector('[data-bars]'), { opacity: 1, duration: 0.15 }, `${label}+=0.6`)
        tl.to(voice, { v: 0.55, duration: 0.1 }, `${label}+=0.6`)
        tl.to(time, { m: m + 2, duration: 0.5 }, `${label}+=0.6`)
        // vyřízeno: shrnutí
        tl.to(voice, { v: 0, duration: 0.15 }, `${label}+=1.1`)
        tl.to(pills[1], { opacity: 0, duration: 0.1 }, `${label}+=1.1`)
        tl.to(pills[2], { opacity: 1, duration: 0.1 }, `${label}+=1.1`)
        tl.to(card.querySelector('[data-bars]'), { opacity: 0, duration: 0.1 }, `${label}+=1.1`)
        tl.to(card.querySelector('[data-summary]'), { opacity: 1, y: 0, duration: 0.25, ease: 'power3.out' }, `${label}+=1.1`)
        // shrnutí odletí do telefonu majitele (karta i signál od Aidy), tam se objeví notifikace
        tl.to(sig[i], { q: 1, duration: 0.5, ease: 'power1.in' }, `${label}+=1.5`)
        tl.to(card, { x: () => flight().x, y: () => flight().y, scale: 0.16, opacity: 0, rotate: 4, duration: 0.45, ease: 'power2.in' }, `${label}+=1.55`)
        notifs.slice(0, i).forEach((n, k) => {
          const depth = i - k
          tl.to(n, { y: () => depth * notifStep(), opacity: () => (depth > maxStack() ? 0 : 1 - depth * 0.15), duration: 0.2 }, `${label}+=1.9`)
        })
        tl.to(notifs[i], { opacity: 1, y: 0, duration: 0.2, ease: 'power3.out' }, `${label}+=1.95`)
        tl.call(cue('ding'), undefined, `${label}+=1.95`)
        doneAt.push(tl.duration())
        prevMin = m + 2
      })
      // finále: kamera stojí u Aidina okna, paprsek z okna k textu
      tl.to(time, { m: Math.max(END, prevMin) + 1, duration: 0.4 }, '>')
      tl.to(scenes[scenes.length - 1], { opacity: 0, y: -12, duration: 0.25 }, '>-0.1')
      tl.to(phone, { opacity: 0.35, duration: 0.35 }, '<')
      tl.addLabel('finale', '<0.1')
      // HUD ustoupí finále (na mobilu by se s ním překrýval); vrátí se se svítáním
      tl.to(hud, { opacity: 0, duration: 0.3 }, 'finale')
      tl.to(finale, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 'finale')
      tl.to(beam, { opacity: 1, scaleY: 1, duration: 0.55, ease: 'power2.out' }, 'finale+=0.1')
      tl.to(aidaLabel, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, 'finale+=0.35')
      tl.to(time, { m: Math.max(END, prevMin) + 40, duration: 0.9 }, 'finale')
      // svítání: text a paprsek odejdou, slunce vychází, kamera stoupá nad město
      tl.addLabel('dawn', '>+0.2')
      tl.to([finale, aidaLabel], { opacity: 0, y: -20, duration: 0.35 }, 'dawn')
      tl.to(beam, { opacity: 0, duration: 0.3 }, 'dawn')
      tl.to(phone, { opacity: 0, duration: 0.3 }, 'dawn')
      tl.to(hud, { opacity: 1, duration: 0.3 }, 'dawn+=0.2')
      tl.to(time, { m: DAWN, duration: 1.6 }, 'dawn')

      // paprsek a štítek u Aidina okna (poloha okna na obrazovce podle 3D kamery)
      const layoutFinale = () => {
        const city = getCity()
        if (!city) return
        const w = city.aidaOnScreen()
        const st = stage.getBoundingClientRect()
        const text = finale.getBoundingClientRect()
        const top = text.bottom - st.top - (Number(gsap.getProperty(finale, 'y')) || 0) + 18
        // štítek sedí nad oknem, paprsek vede od štítku k textu
        const labelTop = w.top - aidaLabel.offsetHeight - 8
        // přes translate (ne left/top): bez přepočtu rozvržení v každém snímku a bez posunů do CLS
        beam.style.translate = `${w.x}px ${top}px`
        beam.style.height = `${Math.max(0, labelTop - top)}px`
        aidaLabel.style.translate = `calc(${w.x}px - 50%) ${labelTop}px`
      }

      const render = () => {
        const m = time.m
        const city = getCity()
        if (active && city) {
          city.setStoryTime(m)
          city.setHour(m / 60)
          city.setVoice(voice.v)
          const list: Signal[] = []
          STORY_CALLS.forEach((call, i) => {
            const s = sig[i]
            if ((s.p > 0 && s.p < 1) || (s.q > 0 && s.q < 1)) list.push({ from: call.industry, color: INDUSTRY_META[call.industry].tint, p: s.p, q: s.q })
          })
          city.setSignals(list)
          const ph = phoneTarget.getBoundingClientRect()
          city.setPhone(((ph.left + ph.width / 2) / window.innerWidth) * 2 - 1, 1 - ((ph.top + ph.height / 3) / window.innerHeight) * 2)
          if (m >= END - 10 && m < DAWN - 60) layoutFinale()
        }
        const tone = toneAt(m)
        if (tone !== lastTone) {
          lastTone = tone
          stage.dataset.tone = tone
          const c = TONES[tone]
          stage.style.setProperty('--st-fg', c.fg)
          stage.style.setProperty('--st-fg-soft', c.soft)
          stage.style.setProperty('--st-pill', c.pill)
        }
        const label = fmt(m)
        if (label !== lastClock) {
          lastClock = label
          clock.textContent = label
          phoneClock.textContent = label
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

      const take = (on: boolean) => {
        active = on
        if (on) render()
      }
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
        // kameru převezme příběh, jakmile začne; nad ním ji vrátí úvodu
        onEnter: () => take(true),
        onEnterBack: () => take(true),
        onLeaveBack: () => {
          take(false)
          getCity()?.setStoryTime(null)
          getCity()?.setSignals([])
        },
      })
      if (st.isActive || st.progress > 0) take(true)

      // Lenis a ScrollTrigger: aktualizace při každém plynulém posunu
      let unsub: (() => void) | undefined
      const off = onLenis((lenis) => {
        unsub?.()
        unsub = lenis?.on('scroll', ScrollTrigger.update)
      })
      return () => {
        off()
        unsub?.()
        st.kill()
        getCity()?.setSignals([])
      }
    },
    { scope: root }
  )

  const handledText = t('handled', { count: STORY_CALLS.length })

  return (
    // délka příběhu 650 / 750 % výšky obrazovky (mobil / desktop) + svítání, plus jedna obrazovka scény
    <div ref={root} className="relative h-[850svh] md:h-[950svh]">
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
        style={{ color: 'var(--st-fg)', '--st-fg': TONES.light.fg, '--st-fg-soft': TONES.light.soft, '--st-pill': TONES.light.pill } as React.CSSProperties}
      >
        {/* HUD v rohu: počítadlo a hodiny */}
        <div data-hud className="absolute left-[var(--mk-gutter)] top-[4.75rem] flex flex-col items-start gap-1.5 md:top-24 md:gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[0.6875rem] md:text-[0.75rem]" style={{ color: 'var(--st-fg-soft)' }}>
            <span className="mk-mono rounded-full px-2.5 py-0.5 uppercase tracking-[0.08em]" style={{ background: 'var(--st-pill)' }}>
              {t('note')}
            </span>
            <span className="mk-mono whitespace-nowrap rounded-full px-2.5 py-0.5 tabular-nums" style={{ background: 'var(--st-pill)' }}>
              {t('chipHandled')} <span data-chip-count>0</span> · {t('chipMissed')} 0
            </span>
          </div>
          <p data-clock className="mk-mono rounded-2xl px-3 py-1 text-[2.25rem] font-medium leading-none tracking-[-0.04em] md:px-4 md:py-1.5 md:text-[3.25rem]" style={{ background: 'var(--st-pill)' }}>
            08:00
          </p>
        </div>

        {/* Popisek scény u zastávky (mezi zastávkami je jen let) */}
        <div className="absolute bottom-[4svh] left-[var(--mk-gutter)] w-[calc(100%-2*var(--mk-gutter)-7.5rem)] md:bottom-[7svh] md:w-[26rem]">
          {STORY_CALLS.map((call) => (
            <p key={call.id} data-scene className="mk-display absolute bottom-0 left-0 max-w-[22ch] rounded-2xl px-4 py-3 text-[1.125rem] leading-snug md:text-[1.6rem]" style={{ background: 'var(--st-pill)' }}>
              {t(`calls.${call.id}.scene`)}
            </p>
          ))}
        </div>

        <div data-card-slot className="absolute left-1/2 top-[22svh] h-[14rem] w-[min(21rem,calc(100%-2*var(--mk-gutter)))] -translate-x-1/2 md:left-auto md:right-[calc(var(--mk-gutter)+15rem)] md:top-1/2 md:h-[17rem] md:w-[25rem] md:-translate-y-1/2 md:translate-x-0">
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

        {/* Finále: paprsek světla z Aidina okna k textu, štítek u okna */}
        <div data-beam className="pointer-events-none absolute left-0 top-0 w-0 origin-bottom">
          <span className="absolute inset-y-0 left-1/2 w-[9rem] -translate-x-1/2 bg-[linear-gradient(to_top,rgb(255_138_76/0.55),rgb(255_138_76/0.16)_55%,transparent)] blur-xl" />
          <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[linear-gradient(to_top,#ffb37f,rgb(255_179_127/0.35)_70%,transparent)]" />
        </div>
        <div data-aida-label className="pointer-events-none absolute left-0 top-0 flex items-center gap-1.5 rounded-full bg-aida px-2.5 py-1 text-xs font-semibold text-ink shadow-[0_0_24px_rgb(255_138_76/0.7)]">
          <span className="size-1.5 rounded-full bg-ink" />
          {td('aida')}
        </div>
        <div data-finale className="pointer-events-none absolute inset-x-0 top-[13svh] text-center md:top-[11svh]">
          <div className="mk-container flex flex-col items-center">
            <p className="mk-display max-w-[24ch] text-[clamp(2.6rem,5.6vw,5.25rem)] text-moon [text-shadow:0_2px_30px_rgb(6_9_26/0.6)]">{handledText}</p>
            <p className="mk-display mt-2 text-[clamp(2.6rem,5.6vw,5.25rem)] text-aida [text-shadow:0_0_42px_rgb(255_138_76/0.55),0_0_90px_rgb(255_138_76/0.3)]">
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
