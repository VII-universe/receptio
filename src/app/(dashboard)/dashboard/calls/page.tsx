import { redirect } from 'next/navigation'

// Stránka se přestěhovala do /dashboard/hovory.
export default function LegacyCallsPage() {
  redirect('/dashboard/hovory')
}
