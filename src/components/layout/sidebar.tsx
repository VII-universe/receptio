'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Bot, CreditCard, LayoutDashboard, Phone, PhoneCall, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Přehled', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agents', label: 'Agenti', icon: Bot },
  { href: '/dashboard/telefon', label: 'Telefon', icon: Phone },
  { href: '/dashboard/calls', label: 'Hovory', icon: PhoneCall },
  { href: '/dashboard/billing', label: 'Fakturace', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Nastavení', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  const links = NAV.map(({ href, label, icon: Icon, exact }) => {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return (
      <Link
        key={href}
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
    )
  })

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r p-4 md:flex">
        <Link href="/dashboard" className="px-3 text-lg font-semibold">
          Receptio
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1">{links}</nav>
        <div className="px-3 pt-4">
          <UserButton />
        </div>
      </aside>
      {/* Mobil */}
      <header className="flex items-center justify-between gap-2 border-b p-3 md:hidden">
        <nav className="flex gap-1 overflow-x-auto">{links}</nav>
        <UserButton />
      </header>
    </>
  )
}
