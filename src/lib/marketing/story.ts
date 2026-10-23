import type { DemoIndustry } from './demo'

// Příběh „24 hodin s Aidou“: kdy zazvoní telefon, u koho a v jakém světle. Texty jsou
// v překladech marketing.story.calls.<id>. Počet hovorů na konci = počet položek (není to statistika).

export type Phase = 'morning' | 'noon' | 'golden' | 'dusk' | 'evening' | 'night'

export interface StoryCall {
  id: string
  time: string
  industry: DemoIndustry
  phase: Phase
  /** Číslo volajícího (zamaskované); null = skryté číslo. */
  number: string | null
}

export const STORY_START = '08:00'
export const STORY_END = '02:00'

export const STORY_CALLS: StoryCall[] = [
  { id: 'c1', time: '08:12', industry: 'dental', phase: 'morning', number: '+420 6•• ••• 218' },
  { id: 'c2', time: '12:30', industry: 'restaurant', phase: 'noon', number: '+420 7•• ••• 904' },
  { id: 'c3', time: '15:00', industry: 'salon', phase: 'golden', number: '+420 6•• ••• 771' },
  { id: 'c4', time: '17:45', industry: 'auto', phase: 'dusk', number: '+420 7•• ••• 356' },
  { id: 'c5', time: '21:00', industry: 'restaurant', phase: 'evening', number: '+420 7•• ••• 129' },
  { id: 'c6', time: '02:00', industry: 'auto', phase: 'night', number: null },
]

export const isDarkPhase = (p: Phase) => p === 'evening' || p === 'night'
