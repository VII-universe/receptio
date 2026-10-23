'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link as IntlLink } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { IconClose, IconMenu } from './icons'
import { LocaleSwitcher } from './locale-switcher'
import { Logo } from './logo'
import { getLenis } from './smooth-scroll'
import { SoundToggle } from './sound-toggle'

const LINKS = [
  { key: 'how', hash: 'jak-to-funguje' },
  { key: 'demo', hash: 'ukazka' },
  { key: 'pricing', hash: 'cenik' },
  { key: 'calculator', hash: 'kalkulacka' },
] as const

type Tone = 'light' | 'dark'

/**
 * Navigace veřejného webu. Při posunu dolů se schová, při posunu nahoru vrátí. Barvu přebírá
 * od sekce pod sebou (data-tone). Odkazy na přihlášení a registraci jsou obyčejné odkazy, bez Clerku.
 */
export function SiteNav() {
  const t = useTranslations('marketing.nav')
  const tc = useTranslations('marketing.common')
  const locale = useLocale()
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [tone, setTone] = useState<Tone>('light')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Schovat při posunu dolů, ukázat při posunu nahoru; tón podle sekce pod navigací.
  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - lastY
      if (Math.abs(delta) > 6) {
        setHidden(delta > 0 && y > 120)
        lastY = y
      }
      setScrolled(y > 24)
      const probe = document.elementsFromPoint(window.innerWidth / 2, 40).find((el) => el.closest('[data-tone]') && !el.closest('header'))
      const section = probe?.closest<HTMLElement>('[data-tone]')
      if (section) setTone(section.dataset.tone === 'dark' ? 'dark' : 'light')
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // Mobilní menu: zámek posunu, Escape zavře, fokus zůstává uvnitř.
  useEffect(() => {
    if (!menuOpen) return
    const toggle = menuButton.current
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    getLenis()?.stop()
    const first = menuRef.current?.querySelector<HTMLElement>('a, button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
      if (e.key !== 'Tab' || !menuRef.current) return
      const items = [...menuRef.current.querySelectorAll<HTMLElement>('a, button')].filter((el) => !el.closest('[hidden]'))
      const [a, b] = [items[0], items[items.length - 1]]
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault()
        b.focus()
      } else if (!e.shiftKey && document.activeElement === b) {
        e.preventDefault()
        a.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = prev
      getLenis()?.start()
      document.removeEventListener('keydown', onKey)
      toggle?.focus()
    }
  }, [menuOpen])

  // Otevřené mobilní menu je noční, hlavička nad ním musí mít stejný tón.
  const dark = menuOpen || tone === 'dark'
  const href = (hash: string) => `/${locale}#${hash}`

  return (
    <>
      <a
        href="#obsah"
        className="sr-only z-[70] rounded-full bg-ink px-5 py-3 text-day focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('skip')}
      </a>
      <header
        data-nav
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          hidden && !menuOpen && '-translate-y-full',
          dark ? 'tone-dark' : 'tone-light',
          scrolled && !menuOpen
            ? dark
              ? 'bg-night/80 shadow-[0_1px_0_rgb(237_235_245/0.08)] backdrop-blur-xl'
              : 'bg-day/80 shadow-[0_1px_0_rgb(20_22_31/0.08)] backdrop-blur-xl'
            : 'bg-transparent'
        )}
      >
        <nav aria-label={t('main')} className="mk-container flex h-[4.5rem] items-center justify-between gap-4">
          <IntlLink href="/" aria-label={t('home')} className="shrink-0 rounded-lg">
            <Logo />
          </IntlLink>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.key}>
                <a href={href(l.hash)} className="rounded-full px-4 py-2.5 text-[0.9375rem] font-medium opacity-80 transition-opacity hover:opacity-100">
                  {t(l.key)}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1 sm:gap-2">
            <SoundToggle className="hidden sm:inline-flex" />
            <LocaleSwitcher className="hidden sm:block" />
            <Link href="/sign-in" className="hidden rounded-full px-4 py-2.5 text-[0.9375rem] font-medium opacity-80 transition-opacity hover:opacity-100 md:inline-flex">
              {t('signIn')}
            </Link>
            <Link href="/sign-up" className="mk-btn mk-btn-primary mk-btn-sm max-[419px]:hidden">
              {tc('tryFree')}
            </Link>
            <button
              ref={menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mk-mobile-menu"
              aria-label={menuOpen ? t('close') : t('menu')}
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex size-11 items-center justify-center rounded-full lg:hidden"
            >
              {menuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </nav>
      </header>

      <div
        id="mk-mobile-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('menu')}
        hidden={!menuOpen}
        className="phase-night fixed inset-0 z-40 overflow-y-auto pt-[4.5rem] lg:hidden"
      >
        <div className="mk-container flex min-h-full flex-col pb-10 pt-8">
          <ul className="flex flex-col">
            {LINKS.map((l, i) => (
              <li key={l.key} className="border-b border-line">
                <a
                  href={href(l.hash)}
                  onClick={() => setMenuOpen(false)}
                  className="mk-display flex items-baseline justify-between py-5 text-[2.5rem]"
                >
                  {t(l.key)}
                  <span className="mk-mono text-sm font-normal tracking-normal text-fg-soft">0{i + 1}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-3 pt-10">
            <Link href="/sign-up" className="mk-btn mk-btn-primary w-full">
              {tc('tryFree')}
            </Link>
            <Link href="/sign-in" className="mk-btn mk-btn-ghost w-full">
              {t('signIn')}
            </Link>
            <div className="flex items-center justify-between pt-4 text-fg-soft">
              <SoundToggle withLabel className="-ml-3" />
              <div className="flex items-center gap-2">
                <span className="text-sm">{t('language')}</span>
                <LocaleSwitcher up onNavigate={() => setMenuOpen(false)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
