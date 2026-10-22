'use client'

// Živé ukázky aplikace pro „Jak to funguje“, stylizované podle dashboardu (karta s ikonou v hlavičce,
// řádky dnů s přepínačem a časy). Spustí se jednou, když vjedou do obrazu; při omezeném pohybu
// rovnou ukážou konečný stav. Jsou dekorativní (obsah kroků nese text vedle nich), proto aria-hidden.
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { IconCheck, IconClock, IconForward, IconMail, IconPhone } from './icons'
import { RollingText } from './rolling-text'

const frame = 'rounded-[1.25rem] bg-white p-4 text-ink shadow-[0_24px_50px_-28px_rgb(20_22_31/0.45)] ring-1 ring-ink/8 md:p-5'

/**
 * Spustí ukázku jednou, když je z větší části vidět. Při omezeném pohybu hned (instant).
 * `wideDelay`: na širokém displeji jsou vidět všechny tři kroky najednou, a tak začnou postupně.
 */
function usePlayOnView<T extends HTMLElement>(wideDelay = 0) {
  const ref = useRef<T>(null)
  const [state, setState] = useState<{ play: boolean; instant: boolean }>({ play: false, instant: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState({ play: true, instant: true })
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect()
          const wait = window.innerWidth >= 1024 ? wideDelay : 0
          timer = setTimeout(() => setState({ play: true, instant: false }), wait)
        }
      },
      { threshold: 0.55 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(timer)
    }
  }, [wideDelay])
  return [ref, state] as const
}

/** Text, který se „napíše“ po znacích od `delay` ms. */
function Typed({ text, play, instant, delay = 0, speed = 32, className }: { text: string; play: boolean; instant: boolean; delay?: number; speed?: number; className?: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!play || instant) return
    let i = 0
    let timer: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      timer = setInterval(() => {
        i++
        setN(i)
        if (i >= text.length) clearInterval(timer)
      }, speed)
    }, delay)
    return () => {
      clearTimeout(start)
      clearInterval(timer)
    }
  }, [play, instant, delay, speed, text])
  const shown = instant ? text.length : n
  const typing = play && !instant && shown > 0 && shown < text.length
  return (
    <span className={className}>
      {text.slice(0, shown)}
      {/* zbytek neviditelně, aby se rozvržení během psaní neměnilo */}
      <span className="relative">
        {typing && <span className="absolute -left-px top-[0.1em] h-[1em] w-px animate-pulse bg-aida" />}
        <span className="invisible">{text.slice(shown) || '​'}</span>
      </span>
    </span>
  )
}

function Switch({ on, delay, instant }: { on: boolean; delay: number; instant: boolean }) {
  return (
    <span className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300', on ? 'bg-aida' : 'bg-ink/15')} style={{ transitionDelay: instant ? '0ms' : `${delay}ms` }}>
      <span
        className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-300', on ? 'translate-x-[1.125rem]' : 'translate-x-0.5')}
        style={{ transitionDelay: instant ? '0ms' : `${delay}ms` }}
      />
    </span>
  )
}

function Head({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-aida/12 text-[#b0441a] ring-1 ring-aida/25">{icon}</span>
      <p className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{title}</p>
      {right}
    </div>
  )
}

/** Krok 1: otevírací doba se vyplní sama, častý dotaz se dopíše, tón se nastaví. */
export function HoursMock() {
  const t = useTranslations('marketing.how.mock')
  const [ref, { play, instant }] = usePlayOnView<HTMLDivElement>()
  const rows = [
    { day: t('weekdays'), open: true, from: '08:00', to: '18:00', at: 200 },
    { day: t('saturday'), open: true, from: '09:00', to: '13:00', at: 900 },
    { day: t('sunday'), open: false, from: '', to: '', at: 1500 },
  ]
  return (
    <div ref={ref} aria-hidden className={frame}>
      <Head icon={<IconClock size={16} />} title={t('hours')} />
      <div className="mt-3 flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.day} className={cn('flex items-center gap-2.5 rounded-xl border border-ink/8 px-3 py-2 transition-colors duration-300', r.open && play ? 'bg-day/70' : 'bg-white')} style={{ transitionDelay: `${r.at}ms` }}>
            <span className="w-11 shrink-0 text-[0.875rem] font-medium">{r.day}</span>
            <Switch on={play && r.open} delay={r.at} instant={instant} />
            {r.open ? (
              <span className="mk-mono ml-auto flex items-center gap-1.5 text-[0.8125rem]">
                <span className="rounded-md border border-ink/10 px-1.5 py-0.5">
                  <Typed text={r.from} play={play} instant={instant} delay={r.at + 250} speed={60} />
                </span>
                –
                <span className="rounded-md border border-ink/10 px-1.5 py-0.5">
                  <Typed text={r.to} play={play} instant={instant} delay={r.at + 500} speed={60} />
                </span>
              </span>
            ) : (
              <span className={cn('ml-auto text-[0.8125rem] text-ink-soft transition-opacity duration-500', play ? 'opacity-100' : 'opacity-0')} style={{ transitionDelay: `${r.at}ms` }}>
                {t('closed')}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[0.75rem] font-medium uppercase tracking-[0.06em] text-ink-soft">{t('faq')}</p>
      <div className="mt-1.5 rounded-xl bg-day px-3.5 py-2.5 text-[0.9375rem]">
        <p className="font-medium">
          <Typed text={t('faqQ')} play={play} instant={instant} delay={1800} />
        </p>
        <p className="text-ink-soft">
          <Typed text={t('faqA')} play={play} instant={instant} delay={2700} />
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[0.75rem] font-medium uppercase tracking-[0.06em] text-ink-soft">{t('tone')}</p>
        <span
          className={cn('rounded-full bg-aida/15 px-3 py-1 text-[0.8125rem] font-medium text-[#9a3a10] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]', play ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}
          style={{ transitionDelay: instant ? '0ms' : '3500ms' }}
        >
          {t('toneValue')}
        </span>
      </div>
    </div>
  )
}

/** Krok 2: číslo se „vytočí“, zapne se a nastaví se přesměrování ze stávajícího čísla. */
export function NumberMock() {
  const t = useTranslations('marketing.how.mock')
  const [ref, { play, instant }] = usePlayOnView<HTMLDivElement>(2600)
  return (
    <div ref={ref} aria-hidden className={frame}>
      <Head
        icon={<IconPhone size={16} />}
        title={t('number')}
        right={
          <span
            className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-1 text-xs font-semibold text-[#1c6b45] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]', play ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}
            style={{ transitionDelay: instant ? '0ms' : '1500ms' }}
          >
            <span className="size-1.5 rounded-full bg-ok" />
            {t('active')}
          </span>
        }
      />
      <p className="mk-mono mt-4 whitespace-nowrap text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium tracking-[-0.02em]">
        <RollingText value="+420 228 ••• 455" play={play} stagger={instant ? 0 : 110} delay={instant ? 0 : 200} />
      </p>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-ink/8 bg-day px-3.5 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-ink-soft ring-1 ring-ink/8">
          <IconForward size={15} />
        </span>
        <div className="min-w-0 flex-1 text-[0.9375rem]">
          <p className="font-medium">{t('forward')}</p>
          <p className="text-[0.8125rem] text-ink-soft">{t('forwardHint')}</p>
        </div>
        <Switch on={play} delay={2100} instant={instant} />
      </div>
    </div>
  )
}

/** Krok 3: na zamčený telefon přijede e-mail se shrnutím hovoru. */
export function NotificationMock() {
  const t = useTranslations('marketing.how.mock')
  const [ref, { play, instant }] = usePlayOnView<HTMLDivElement>(5200)
  return (
    <div ref={ref} aria-hidden className="rounded-[2rem] bg-night p-3 shadow-[0_30px_60px_-30px_rgb(14_22_48/0.8)]">
      <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-moon/15" />
      <p className="mk-mono text-center text-[2.25rem] font-medium leading-none tracking-[-0.03em] text-moon/90">19:42</p>
      <div className="relative mt-4 h-[8.5rem]">
        <div
          className={cn(
            'absolute inset-x-0 top-0 rounded-[1.25rem] bg-moon/95 p-4 text-ink transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            play ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0',
            play && !instant && 'story-buzz'
          )}
          style={{ transitionDelay: instant ? '0ms' : '400ms' }}
        >
          <div className="flex items-center gap-2 text-[0.75rem] text-ink-soft">
            <span className="flex size-5 items-center justify-center rounded-md bg-aida text-white">
              <IconMail size={13} />
            </span>
            <span className="font-semibold text-ink">Receptio</span>
            <span className="ml-auto">{t('now')}</span>
          </div>
          <p className="mt-2 text-[0.9375rem] font-semibold leading-snug">{t('notifTitle')}</p>
          <p className="mt-1 text-[0.9375rem] leading-snug text-ink-soft">{t('notifBody')}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] text-ink-soft">
            <IconCheck size={13} className="text-[#1c6b45]" />
            {t('notifMeta')}
          </p>
        </div>
      </div>
    </div>
  )
}
