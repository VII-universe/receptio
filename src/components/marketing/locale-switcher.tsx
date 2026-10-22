'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { LOCALE_META } from '@/i18n/locales'
import { Link, usePathname } from '@/i18n/navigation'
import { LOCALES } from '@/i18n/routing'
import { cn } from '@/lib/utils'
import { IconChevronDown } from './icons'

/**
 * Přepínač jazyka s textovými kódy (bez vlajek). Jazyky jsou obyčejné odkazy na stejnou stránku
 * v jiném jazyce, takže fungují i bez JavaScriptu a vyhledávače je projdou.
 */
export function LocaleSwitcher({ className, onNavigate, up = false }: { className?: string; onNavigate?: () => void; up?: boolean }) {
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('marketing.nav')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        ref.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t('language')}: ${LOCALE_META[locale as keyof typeof LOCALE_META]?.name ?? locale}`}
        onClick={() => setOpen((o) => !o)}
        className="mk-mono inline-flex h-11 items-center gap-1 rounded-full px-3 text-sm font-medium uppercase tracking-wider transition-colors hover:bg-fg/8"
      >
        {locale}
        <IconChevronDown size={16} className={cn('transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div
        id={listId}
        hidden={!open}
        className={cn(
          'absolute right-0 z-10 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-ink/10 bg-day p-2 text-ink shadow-[0_24px_60px_-20px_rgb(20_22_31/0.45)]',
          up ? 'bottom-full mb-2' : 'top-full mt-2'
        )}
      >
        <ul className="grid grid-cols-2 gap-0.5 sm:grid-cols-3">
          {LOCALES.map((l) => (
            <li key={l}>
              <Link
                href={pathname as '/'}
                locale={l}
                lang={l}
                aria-current={l === locale ? 'true' : undefined}
                onClick={() => {
                  setOpen(false)
                  onNavigate?.()
                }}
                className={cn(
                  'flex items-baseline gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-ink/6',
                  l === locale && 'bg-ink text-day hover:bg-ink'
                )}
              >
                <span className="mk-mono w-6 text-xs font-semibold uppercase">{l}</span>
                <span className="truncate">{LOCALE_META[l].name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
