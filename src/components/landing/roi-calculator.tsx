'use client'

import Link from 'next/link'
import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const RECEPTIO_PRICE = 990 // Kč/měsíc (plán Starter)

const czk = (n: number) => `${Math.round(n).toLocaleString('cs-CZ')} Kč`

function pluralDays(n: number) {
  if (n === 1) return 'den'
  if (n >= 2 && n <= 4) return 'dny'
  return 'dní'
}

function Field({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  suffix: string
}) {
  // Při psaní povolíme prázdné/rozepsané pole, hodnotu omezíme na rozsah až při opuštění pole.
  const [draft, setDraft] = useState<string | null>(null)
  const clamp = (v: number) => Math.min(max, Math.max(min, v))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={`${id}-number`}
            type="number"
            inputMode="numeric"
            className="h-8 w-24 text-right"
            min={min}
            max={max}
            step={step}
            aria-label={label}
            value={draft ?? value}
            onChange={(e) => {
              setDraft(e.target.value)
              const n = parseFloat(e.target.value)
              if (!Number.isNaN(n)) onChange(clamp(n))
            }}
            onBlur={() => setDraft(null)}
          />
          <span className="w-8 text-sm text-muted-foreground">{suffix}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          setDraft(null)
          onChange(Number(e.target.value))
        }}
        className="h-2 w-full cursor-pointer accent-primary"
      />
    </div>
  )
}

export function RoiCalculator() {
  const [missedPerWeek, setMissedPerWeek] = useState(10)
  const [avgValue, setAvgValue] = useState(800)
  const [conversion, setConversion] = useState(30)

  const monthlyLoss = (missedPerWeek * 4 * avgValue * conversion) / 100
  const yearlyLoss = monthlyLoss * 12
  const paybackDays = Math.max(1, Math.ceil(RECEPTIO_PRICE / (monthlyLoss / 30)))

  return (
    <div className="grid gap-8 rounded-2xl border bg-card p-6 shadow-sm md:p-10 lg:grid-cols-2">
      <div className="flex flex-col gap-8">
        <Field
          id="missed"
          label="Zmeškaných hovorů týdně"
          value={missedPerWeek}
          onChange={setMissedPerWeek}
          min={1}
          max={100}
          step={1}
          suffix="hovorů"
        />
        <Field
          id="value"
          label="Průměrná hodnota zákazníka"
          value={avgValue}
          onChange={setAvgValue}
          min={100}
          max={10000}
          step={50}
          suffix="Kč"
        />
        <Field
          id="conversion"
          label="Míra konverze zmeškaného hovoru"
          value={conversion}
          onChange={setConversion}
          min={5}
          max={80}
          step={1}
          suffix="%"
        />
      </div>

      <div className="flex flex-col justify-between gap-6" aria-live="polite">
        <div>
          <p className="text-sm text-muted-foreground">Měsíční ztráta</p>
          <p className="text-5xl font-bold tracking-tight text-destructive sm:text-6xl">{czk(monthlyLoss)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Roční ztráta</p>
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{czk(yearlyLoss)}</p>
        </div>
        <div className="rounded-xl bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            Receptio stojí {czk(RECEPTIO_PRICE)}/měsíc
          </p>
          <p className="mt-1 text-xl font-semibold">
            Receptio se zaplatí za {paybackDays} {pluralDays(paybackDays)}
          </p>
        </div>
        <Link href="/sign-up" className={buttonVariants({ size: 'lg' })}>
          Začít zachraňovat hovory →
        </Link>
        <p className="text-xs text-muted-foreground">
          Orientační výpočet: zmeškané hovory × 4 týdny × hodnota zákazníka × míra konverze.
        </p>
      </div>
    </div>
  )
}
