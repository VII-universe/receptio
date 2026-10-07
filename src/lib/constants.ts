import type { BusinessHours, Industry } from '@/types'

export const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'dentist', label: 'Dental clinic' },
  { value: 'hair_salon', label: 'Hair salon / Beauty' },
  { value: 'auto_repair', label: 'Auto repair shop' },
  { value: 'veterinary', label: 'Veterinary clinic' },
  { value: 'law_firm', label: 'Law firm' },
  { value: 'fitness', label: 'Fitness / Gym' },
  { value: 'other', label: 'Other' },
]

export const DAYS: { key: keyof BusinessHours; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
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
