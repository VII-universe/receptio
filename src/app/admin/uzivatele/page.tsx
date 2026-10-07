import { requireAdminPage } from '@/lib/admin/require-admin'

export const metadata = { title: 'Admin – Uživatelé' }

export default async function AdminUsersPage() {
  await requireAdminPage()
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold">Uživatelé</h1>
      <p className="mt-2 text-muted-foreground">Brzy k dispozici.</p>
    </div>
  )
}
