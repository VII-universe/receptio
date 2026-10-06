import { redirect } from 'next/navigation'
import { getCurrentWorkspace } from '@/lib/auth'
import { SetupForm } from './setup-form'

export const metadata = { title: 'Nastavení firmy' }

export default async function SetupPage() {
  if (await getCurrentWorkspace()) redirect('/dashboard')

  return (
    <div className="mx-auto max-w-md">
      <SetupForm />
    </div>
  )
}
