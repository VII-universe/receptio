'use client'

/**
 * Animated voice waveform visualization with a phone icon.
 * Pure CSS animation — no external deps, no JS runtime overhead.
 */
export function PhoneWave() {
  const bars = [3, 5, 8, 12, 9, 14, 10, 7, 11, 6, 9, 13, 8, 5, 4] as const

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      <div className="absolute size-56 rounded-full bg-indigo-600/10 blur-2xl" aria-hidden />

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/5 px-10 py-8 backdrop-blur-sm">
        {/* Status row */}
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-sm font-medium text-zinc-300">Hovor aktivní · 00:42</span>
        </div>

        {/* Waveform bars */}
        <div className="flex items-center gap-[3px]" aria-label="Hlasová vlna" role="img">
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-indigo-400 opacity-80"
              style={{
                height: `${h * 3}px`,
                animation: `wave ${0.8 + (i % 5) * 0.15}s ease-in-out ${(i * 0.07).toFixed(2)}s infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Transcript line */}
        <p className="text-center text-sm text-zinc-400">
          <span className="text-zinc-200">&ldquo;Dobrý den, jaká je vaše otevírací doba?&rdquo;</span>
        </p>
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
