import { requireAdminPage } from '@/lib/admin/require-admin'

export const metadata = { title: 'Admin – Systém' }

export default async function AdminSystemPage() {
  await requireAdminPage()
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold">Systém</h1>
      <p className="mt-2 text-muted-foreground">Brzy k dispozici.</p>
    </div>
  )
}
