import Link from 'next/link'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Receptio
        </Link>
      </header>
      {children}
    </div>
  )
}
