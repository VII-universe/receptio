'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { BarChart2, Bot, CreditCard, LayoutDashboard, Phone, PhoneCall, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV: {
  href: string
  label: string
  icon: typeof Bot
  exact?: boolean
  separatorBefore?: boolean
  adminOnly?: boolean // členové týmu položku nevidí
}[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/analytika', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/telefon', label: 'Phone Numbers', icon: Phone, adminOnly: true },
  { href: '/dashboard/hovory', label: 'Calls', icon: PhoneCall },
  { href: '/dashboard/fakturace', label: 'Billing', icon: CreditCard, adminOnly: true },
  { href: '/dashboard/tym', label: 'Team', icon: Users },
  { href: '/dashboard/nastaveni', label: 'Settings', icon: Settings, separatorBefore: true, adminOnly: true },
]

export function Sidebar({ role }: { role: 'admin' | 'member' }) {
  const pathname = usePathname()

  const renderLinks = (vertical: boolean) =>
    NAV.filter((item) => role === 'admin' || !item.adminOnly).map(({ href, label, icon: Icon, exact, separatorBefore }) => {
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
            {label}
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
        <div className="px-3 pt-4">
          <UserButton />
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
