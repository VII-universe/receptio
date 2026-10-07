import { requireAdminPage } from '@/lib/admin/require-admin'

export const metadata = { title: 'Admin – Hovory' }

export default async function AdminCallsPage() {
  await requireAdminPage()
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold">Hovory</h1>
      <p className="mt-2 text-muted-foreground">Brzy k dispozici.</p>
    </div>
  )
}
