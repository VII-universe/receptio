import Link from 'next/link'
import { AdminNav } from '@/components/admin/admin-nav'
import { requireAdminPage } from '@/lib/admin/require-admin'

export const metadata = { title: 'Admin', robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage()

  const brand = (
    <div className="flex items-center gap-2 px-3">
      <span className="text-lg font-semibold text-white">Receptio</span>
      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Admin</span>
    </div>
  )
  const back = (
    <Link href="/dashboard" className="px-3 text-sm text-neutral-400 hover:text-white">
      ← Back to dashboard
    </Link>
  )

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 bg-neutral-950 p-4 md:flex">
        {brand}
        <div className="flex-1">
          <AdminNav orientation="vertical" />
        </div>
        {back}
      </aside>
      <header className="flex flex-col gap-3 bg-neutral-950 p-3 md:hidden">
        <div className="flex items-center justify-between">
          {brand}
          {back}
        </div>
        <AdminNav orientation="horizontal" />
      </header>
      <main className="flex-1 border-t-2 border-red-600 p-4 md:border-t-0 md:border-l-2 md:p-8">{children}</main>
    </div>
  )
}
