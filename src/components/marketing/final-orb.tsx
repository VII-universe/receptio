'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'
import type { AudioLevels } from './demo-player'
import { OrbStatic } from './orb-static'

const AidaOrb = dynamic(() => import('./aida-orb'), { ssr: false, loading: () => <OrbStatic /> })

/** Orb ve finální výzvě: jen tiše dýchá (bez zvuku), mimo obraz se nevykresluje. */
export function FinalOrb({ className }: { className?: string }) {
  const levels = useRef<AudioLevels>({ amp: 0, low: 0, high: 0, speaker: 1, playing: false })
  return (
    <div className={className}>
      <AidaOrb tint="#ff8a4c" levels={levels} active={false} />
    </div>
  )
}
