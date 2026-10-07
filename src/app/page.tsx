import Link from 'next/link'
import { Check } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Navbar } from '@/components/layout/navbar'
import { RoiCalculator } from '@/components/landing/roi-calculator'
import { PLANS, type PlanId } from '@/lib/stripe/plans'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: 'Nastavíte asistenta',
    text: 'Popíšete svůj provoz, otevírací dobu a časté dotazy zákazníků.',
  },
  {
    title: 'Přiřadíte číslo',
    text: 'Dostanete české telefonní číslo nebo použijete přesměrování z toho stávajícího.',
  },
  {
    title: 'AI přijímá hovory',
    text: 'Každý hovor je zaznamenaný a shrnutí vám přijde na email nebo SMS.',
  },
]

const USE_CASES = [
  { icon: '🍽️', title: 'Restaurace', text: 'Rezervace, otevírací doba, dotazy na menu.' },
  { icon: '🦷', title: 'Zubař', text: 'Objednání termínu, urgentní případy.' },
  { icon: '🔧', title: 'Autoservis', text: 'Příjem zakázek, stav opravy.' },
  { icon: '✂️', title: 'Kadeřnictví', text: 'Rezervace, ceník, dostupnost.' },
]

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'business', 'pro']

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Váš recepční nikdy nespí</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            AI asistent přijme každý hovor, odpoví na otázky a předá vzkaz — i ve 2 v noci.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className={buttonVariants({ size: 'lg' })}>
              Vyzkoušet zdarma
            </Link>
            <Link href="/sign-in" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
              Přihlásit se
            </Link>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Funguje pro restaurace, zubařské ordinace, autoservisy a kadeřnictví
          </p>
        </section>

        {/* Jak to funguje */}
        <section id="jak-to-funguje" className="scroll-mt-20 border-t bg-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Jak to funguje</h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                  <p className="text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ROI kalkulačka */}
        <section id="kalkulacka" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Kolik vás stojí zmeškaný hovor?
            </h2>
            <RoiCalculator />
          </div>
        </section>

        {/* Ceník */}
        <section id="cenik" className="scroll-mt-20 border-t bg-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Ceník</h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PLAN_ORDER.map((id) => {
                const plan = PLANS[id]
                return (
                  <div key={id} className="flex flex-col gap-5 rounded-2xl border bg-card p-6">
                    <div>
                      <h3 className="text-lg font-semibold">{plan.nameCs}</h3>
                      <p className="mt-2">
                        <span className="text-3xl font-bold">
                          {plan.price === 0 ? '0' : plan.price.toLocaleString('cs-CZ')} Kč
                        </span>
                        <span className="text-sm text-muted-foreground">/měsíc</span>
                      </p>
                    </div>
                    <ul className="flex flex-1 flex-col gap-2 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/sign-up"
                      className={cn(buttonVariants({ variant: id === 'free' ? 'outline' : 'default' }))}
                    >
                      {id === 'free' ? 'Začít zdarma' : `Vybrat ${plan.nameCs}`}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Použití */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Pro koho je Receptio</h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {USE_CASES.map((u) => (
                <div key={u.title} className="rounded-2xl border p-6">
                  <div className="text-3xl" aria-hidden>
                    {u.icon}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{u.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{u.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-lg font-semibold">Receptio</p>
            <p className="mt-1 text-sm text-muted-foreground">AI hlasový recepční pro malé firmy.</p>
          </div>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/sign-in" className="hover:text-foreground">
              Přihlásit se
            </Link>
            <Link href="/sign-up" className="hover:text-foreground">
              Vyzkoušet zdarma
            </Link>
            <Link href="/api-docs" className="hover:text-foreground">
              API dokumentace
            </Link>
            <Link href="#" className="hover:text-foreground">
              Zásady ochrany soukromí
            </Link>
          </nav>
        </div>
        <p className="border-t py-4 text-center text-xs text-muted-foreground">
          © 2026 Receptio. Všechna práva vyhrazena.
        </p>
      </footer>
    </div>
  )
}
