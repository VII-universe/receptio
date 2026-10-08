/** Miniaturní průběh v dlaždici: jedna čára 2 px, koncový bod s prstencem, bez os (hodnota je v dlaždici). */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const W = 120
  const H = 32
  const max = Math.max(1, ...values)
  const x = (i: number) => 4 + (values.length <= 1 ? (W - 8) / 2 : (i / (values.length - 1)) * (W - 8))
  const y = (v: number) => H - 5 - (v / max) * (H - 10)
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const lastIdx = values.length - 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className ?? 'h-8 w-full'} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {values.length > 0 && <circle cx={x(lastIdx)} cy={y(values[lastIdx])} r="3" fill="currentColor" stroke="var(--card)" strokeWidth="2" />}
    </svg>
  )
}
