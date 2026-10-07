import { requireAdminPage } from '@/lib/admin/require-admin'

export const metadata = { title: 'Admin – Calls' }

export default async function AdminCallsPage() {
  await requireAdminPage()
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold">Calls</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </div>
  )
}
