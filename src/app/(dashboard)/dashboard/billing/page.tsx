import { redirect } from 'next/navigation'

// Stránka se přestěhovala do /dashboard/fakturace (zachová i ?success=true po platbě).
export default async function LegacyBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const { success } = await searchParams
  redirect(success === 'true' ? '/dashboard/fakturace?success=true' : '/dashboard/fakturace')
}
