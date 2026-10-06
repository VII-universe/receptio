import { redirect } from 'next/navigation'
import { getCurrentWorkspace } from '@/lib/auth'
import { getCallLogsPage } from '@/lib/supabase/queries'
import { CallsList } from './calls-list'

export const metadata = { title: 'Hovory' }

const PAGE_SIZE = 20

export default async function CallsPage() {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/dashboard/setup')

  const { calls, total } = await getCallLogsPage(workspace.id, { page: 1, limit: PAGE_SIZE })

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold">Hovory</h1>
      <CallsList initialCalls={calls} total={total} pageSize={PAGE_SIZE} />
    </div>
  )
}
