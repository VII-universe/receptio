import { getAdminWorkspaces } from '@/lib/admin/queries'
import { WorkspacesTable } from './workspaces-table'

export const metadata = { title: 'Admin – Workspace' }

export default async function AdminWorkspacesPage() {
  const workspaces = await getAdminWorkspaces()
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Workspace</h1>
      <WorkspacesTable
        rows={workspaces.map((w) => ({
          id: w.id,
          name: w.name,
          plan: w.plan,
          currency: w.currency ?? 'CZK',
          agents: w.agents,
          calls: w.calls,
          createdAt: w.created_at,
        }))}
      />
    </div>
  )
}
