'use client'

import { cn } from '@/lib/utils'

const DIGITS = '0123456789'

/**
 * Text, ve kterém se číslice „protočí“ na svou hodnotu (sloupec 0–9 posunutý transformací).
 * Ostatní znaky zůstávají. Pro čtečky je hodnota v sr-only, animace je aria-hidden.
 * `play` spouští otočení (do té doby nuly), `stagger` zpoždění mezi číslicemi v ms.
 */
export function RollingText({
  value,
  play = true,
  stagger = 60,
  delay = 0,
  className,
}: {
  value: string
  play?: boolean
  stagger?: number
  delay?: number
  className?: string
}) {
  let digitIndex = 0
  return (
    <span className={cn('relative inline-flex', className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex">
        {[...value].map((ch, i) => {
          if (!DIGITS.includes(ch)) {
            return (
              <span key={i} className="inline-block h-[1.15em] whitespace-pre leading-[1.15em]">
                {ch}
              </span>
            )
          }
          const d = Number(ch)
          const wait = delay + digitIndex++ * stagger
          return (
            <span key={i} className="relative inline-block h-[1.15em] overflow-hidden leading-[1.15em]">
              <span className="invisible">0</span>
              <span
                className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                style={{ transform: `translateY(-${(play ? d : 0) * 1.15}em)`, transitionDelay: `${play ? wait : 0}ms` }}
              >
                {[...DIGITS].map((n) => (
                  <span key={n} className="h-[1.15em] text-center">
                    {n}
                  </span>
                ))}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}
