import type { BusinessHours, Industry } from '@/types'

export const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: 'restaurant', label: 'Restaurace' },
  { value: 'dentist', label: 'Zubař / Ordinace' },
  { value: 'hair_salon', label: 'Kadeřnictví / Kosmetika' },
  { value: 'auto_repair', label: 'Autoservis' },
  { value: 'veterinary', label: 'Veterinář' },
  { value: 'law_firm', label: 'Advokát / Právník' },
  { value: 'fitness', label: 'Fitness / Posilovna' },
  { value: 'other', label: 'Jiné' },
]

export const LANGUAGE_OPTIONS = [
  { value: 'cs', label: 'Čeština' },
  { value: 'sk', label: 'Slovenština' },
  { value: 'en', label: 'Angličtina' },
] as const

export const DAYS: { key: keyof BusinessHours; label: string }[] = [
  { key: 'monday', label: 'Pondělí' },
  { key: 'tuesday', label: 'Úterý' },
  { key: 'wednesday', label: 'Středa' },
  { key: 'thursday', label: 'Čtvrtek' },
  { key: 'friday', label: 'Pátek' },
  { key: 'saturday', label: 'Sobota' },
  { key: 'sunday', label: 'Neděle' },
]

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: true, from: '08:00', to: '17:00' },
  tuesday: { open: true, from: '08:00', to: '17:00' },
  wednesday: { open: true, from: '08:00', to: '17:00' },
  thursday: { open: true, from: '08:00', to: '17:00' },
  friday: { open: true, from: '08:00', to: '17:00' },
  saturday: { open: false, from: '09:00', to: '13:00' },
  sunday: { open: false, from: '09:00', to: '13:00' },
}

export const VOICES: Record<'cs' | 'sk' | 'en', { id: string; name: string }[]> = {
  cs: [
    { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte (ženský)' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (mužský)' },
  ],
  sk: [{ id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte (ženský)' }],
  en: [
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (ženský)' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (mužský)' },
  ],
}

export const DEFAULT_END_CALL_PHRASES = ['nashledanou', 'na shledanou', 'sbohem']
