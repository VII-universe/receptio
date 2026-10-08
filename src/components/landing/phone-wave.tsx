'use client'

import { useTranslations } from 'next-intl'

/**
 * Animated voice waveform visualization with a phone icon.
 * Pure CSS animation — no external deps, no JS runtime overhead.
 */
export function PhoneWave() {
  const t = useTranslations('landing.phone')
  const bars = [3, 5, 8, 12, 9, 14, 10, 7, 11, 6, 9, 13, 8, 5, 4] as const

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      <div className="absolute size-56 rounded-full bg-indigo-600/10 blur-2xl" aria-hidden />

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center gap-6 glass-strong rounded-3xl px-10 py-8">
        {/* Status row */}
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]" />
          <span className="text-sm font-medium text-zinc-300">{t('active')}</span>
        </div>

        {/* Waveform bars */}
        <div className="flex items-center gap-[3px]" aria-label={t('wave')} role="img">
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-gradient-to-t from-indigo-500 to-violet-400 opacity-80"
              style={{
                height: `${h * 3}px`,
                animation: `wave ${0.8 + (i % 5) * 0.15}s ease-in-out ${(i * 0.07).toFixed(2)}s infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Transcript: volající a odpověď asistenta */}
        <div className="flex flex-col gap-2">
          <p className="text-center text-sm text-zinc-400">
            <span className="text-zinc-200">&ldquo;{t('question')}&rdquo;</span>
          </p>
          <div className="mt-2 flex items-start gap-2 text-left">
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white">R</span>
            <p className="max-w-[220px] text-xs text-zinc-400">
              <span className="text-zinc-200">{t('answerStrong')}</span> {t('answerRest')}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); opacity: 0.5; }
          to   { transform: scaleY(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
