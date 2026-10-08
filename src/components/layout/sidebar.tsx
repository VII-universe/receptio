'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { UserButton } from '@clerk/nextjs'
import { BarChart2, Bot, CreditCard, LayoutDashboard, Phone, PhoneCall, Settings, ShieldCheck, Users } from 'lucide-react'
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
              <div role="separator" className="my-2 border-t" />
            ) : (
              <span role="separator" className="mx-1 h-5 w-px shrink-0 self-center bg-border" />
            ))}
          <Link
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {label ?? t(key)}
          </Link>
        </Fragment>
      )
    })

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r p-4 md:flex">
        <Link href="/dashboard" className="px-3 text-lg font-semibold">
          Receptio
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1">{renderLinks(true)}</nav>
        <div className="flex items-center justify-between px-3 pt-4">
          <UserButton />
          <ThemeToggle />
        </div>
      </aside>
      {/* Mobil */}
      <header className="flex items-center justify-between gap-2 border-b p-3 md:hidden">
        <nav className="flex gap-1 overflow-x-auto">{renderLinks(false)}</nav>
        <UserButton />
      </header>
    </>
  )
}
