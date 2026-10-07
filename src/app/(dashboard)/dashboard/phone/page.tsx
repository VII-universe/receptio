import { redirect } from 'next/navigation'

// Stránka se přestěhovala do /dashboard/telefon.
export default function LegacyPhonePage() {
  redirect('/dashboard/telefon')
}
