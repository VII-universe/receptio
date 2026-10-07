'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin', label: 'Přehled', exact: true },
  { href: '/admin/workspaces', label: 'Workspace' },
  { href: '/admin/uzivatele', label: 'Uživatelé' },
  { href: '/admin/hovory', label: 'Hovory' },
  { href: '/admin/system', label: 'Systém' },
]

export function AdminNav({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  const pathname = usePathname()
  return (
    <nav className={cn('flex gap-1', orientation === 'vertical' ? 'flex-col' : 'overflow-x-auto')}>
      {NAV.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-md px-3 py-2 text-sm transition-colors whitespace-nowrap',
              active ? 'bg-red-600 font-medium text-white' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
