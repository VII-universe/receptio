'use client'

import { useTranslations } from 'next-intl'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useTheme } from './theme-provider'
import { ACCENTS, type Accent, type Mode } from './theme-script'

const MODES: { value: Mode; icon: typeof Sun }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
]

// Náhledové barvy kuliček (odpovídají --primary v globals.css).
const SWATCH: Record<Accent, string> = {
  neutral: 'bg-zinc-700 dark:bg-zinc-300',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
}

/** Karta v Nastavení: světlý / tmavý / systémový režim a akcentová barva. */
export function AppearanceCard() {
  const t = useTranslations('appearance')
  const { mode, accent, setMode, setAccent } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div role="radiogroup" aria-label={t('mode')} className="grid max-w-md grid-cols-3 gap-2">
          {MODES.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted',
                mode === value ? 'border-primary bg-muted font-medium ring-1 ring-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="size-5" />
              {t(value)}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-3 text-sm font-medium">{t('accent')}</p>
          <div role="radiogroup" aria-label={t('accent')} className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={accent === a}
                aria-label={t(`accents.${a}`)}
                title={t(`accents.${a}`)}
                onClick={() => setAccent(a)}
                className={cn(
                  'flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-all hover:scale-110',
                  SWATCH[a],
                  accent === a && 'ring-2 ring-ring'
                )}
              >
                {accent === a && <Check className="size-4 text-white dark:text-zinc-900" />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t(`accents.${accent}`)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/** Malé tlačítko pro rychlé přepnutí světlý ↔ tmavý (sidebar). */
export function ThemeToggle() {
  const t = useTranslations('appearance')
  const { resolved, setMode } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={t(next)}
      title={t(next)}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {resolved === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
