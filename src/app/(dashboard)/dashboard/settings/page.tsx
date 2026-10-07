import { redirect } from 'next/navigation'

// Stránka se přestěhovala do /dashboard/nastaveni.
export default function LegacySettingsPage() {
  redirect('/dashboard/nastaveni')
}
