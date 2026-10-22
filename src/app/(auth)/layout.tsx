import { ClerkProvider } from '@clerk/nextjs'

// Přihlášení a registrace: Clerk komponenty <SignIn> a <SignUp> potřebují ClerkProvider.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>
}
