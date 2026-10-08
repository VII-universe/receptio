'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { UserButton } from '@clerk/nextjs'
import { BarChart2, Bot, CalendarDays, CreditCard, LayoutDashboard, Phone, PhoneCall, Settings, ShieldCheck, Users } from 'lucide-react'
import { LogoMark } from '@/components/layout/logo-mark'
import { ThemeToggle } from '@/components/theme/appearance'
import { cn } from '@/lib/utils'

const NAV: {
  href: string
  key: string // klíč v překladech (nav.*)
  icon: typeof Bot
  exact?: boolean
  separatorBefore?: boolean
  adminOnly?: boolean // členové týmu položku nevidí
  label?: string // pevný popisek bez překladu (admin panel)
}[] = [
  { href: '/dashboard', key: 'overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/analytics', key: 'analytics', icon: BarChart2 },
  { href: '/dashboard/agents', key: 'agents', icon: Bot },
  { href: '/dashboard/phone-numbers', key: 'phoneNumbers', icon: Phone, adminOnly: true },
  { href: '/dashboard/calls', key: 'calls', icon: PhoneCall },
  { href: '/dashboard/calendar', key: 'calendar', icon: CalendarDays },
  { href: '/dashboard/billing', key: 'billing', icon: CreditCard, adminOnly: true },
  { href: '/dashboard/team', key: 'team', icon: Users },
  { href: '/dashboard/settings', key: 'settings', icon: Settings, separatorBefore: true, adminOnly: true },
]

// Jen pro adminy platformy (Clerk publicMetadata.role === 'admin'); stránky si roli ověřují samy.
const ADMIN_ITEM: (typeof NAV)[number] = { href: '/dashboard/admin', key: 'admin', label: 'Admin', icon: ShieldCheck, separatorBefore: true }

export function Sidebar({ role, isAdmin = false }: { role: 'admin' | 'member'; isAdmin?: boolean }) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const renderLinks = (vertical: boolean) =>
    [...NAV, ...(isAdmin ? [ADMIN_ITEM] : [])]
      .filter((item) => role === 'admin' || !item.adminOnly)
      .map(({ href, key, label, icon: Icon, exact, separatorBefore }) => {
      const active = exact ? pathname === href : pathname.startsWith(href)
      return (
        <Fragment key={href}>
          {separatorBefore &&
            (vertical ? (
              <div role="separator" className="my-2 border-t border-sidebar-border" />
            ) : (
              <span role="separator" className="mx-1 h-5 w-px shrink-0 self-center bg-border" />
            ))}
          <Link
            href={href}
            className={cn(
              'group relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-primary/15 font-medium text-foreground ring-1 ring-primary/25'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {active && vertical && <span className="absolute -left-4 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" aria-hidden />}
            <Icon className={cn('size-4 transition-colors', active ? 'text-primary' : 'group-hover:text-foreground')} strokeWidth={active ? 2 : 1.75} />
            {label ?? t(key)}
          </Link>
        </Fragment>
      )
    })

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 backdrop-blur-2xl md:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-3 text-lg font-semibold tracking-tight">
          <LogoMark className="size-8" />
          Receptio
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">{renderLinks(true)}</nav>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-sidebar-border bg-muted/60 px-3 py-2.5">
          <UserButton />
          <ThemeToggle />
        </div>
      </aside>
      {/* Mobil */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-sidebar-border bg-background/80 p-3 backdrop-blur-xl md:hidden">
        <nav className="flex gap-1 overflow-x-auto">{renderLinks(false)}</nav>
        <UserButton />
      </header>
    </>
  )
}
