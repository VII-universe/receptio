import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Receptio
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#jak-to-funguje" className="hover:text-foreground">
            Jak to funguje
          </a>
          <a href="#cenik" className="hover:text-foreground">
            Ceník
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/sign-in" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Přihlásit se
          </Link>
          <Link href="/sign-up" className={buttonVariants({ size: 'sm' })}>
            Vyzkoušet zdarma
          </Link>
        </div>
      </div>
    </header>
  )
}
