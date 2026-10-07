import { redirect } from 'next/navigation'

export default async function LegacyCallPage({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/dashboard/hovory/${encodeURIComponent((await params).id)}`)
}
