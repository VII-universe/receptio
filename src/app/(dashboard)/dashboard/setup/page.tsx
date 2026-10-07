import { redirect } from 'next/navigation'

// Nastavení firmy je součástí onboardingu.
export default function LegacySetupPage() {
  redirect('/onboarding')
}
