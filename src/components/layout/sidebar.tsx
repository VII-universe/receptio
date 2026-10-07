'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Bot, CreditCard, LayoutDashboard, Phone, PhoneCall, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV: { href: string; label: string; icon: typeof Bot; exact?: boolean; separatorBefore?: boolean }[] = [
  { href: '/dashboard', label: 'Přehled', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agents', label: 'Agenti', icon: Bot },
  { href: '/dashboard/telefon', label: 'Telefonní čísla', icon: Phone },
  { href: '/dashboard/hovory', label: 'Hovory', icon: PhoneCall },
  { href: '/dashboard/fakturace', label: 'Fakturace', icon: CreditCard },
  { href: '/dashboard/nastaveni', label: 'Nastavení', icon: Settings, separatorBefore: true },
]

export function Sidebar() {
  const pathname = usePathname()

  const renderLinks = (vertical: boolean) =>
    NAV.map(({ href, label, icon: Icon, exact, separatorBefore }) => {
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
