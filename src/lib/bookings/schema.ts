import { z } from 'zod'
import { isDate, isTime } from './time'

const iso = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date-time')

export const newBookingSchema = z.object({
  caller_name: z.string().trim().min(1).max(120),
  caller_phone: z.string().trim().max(40).nullish(),
  starts_at: iso,
  ends_at: iso.nullish(),
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).nullish(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
})

export const bookingPatchSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  starts_at: iso.optional(),
  ends_at: iso.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  caller_name: z.string().trim().min(1).max(120).optional(),
  caller_phone: z.string().trim().max(40).nullable().optional(),
})

const time = z.string().refine(isTime, 'HH:MM')
const dateStr = z.string().refine(isDate, 'YYYY-MM-DD')

export const SLOT_DURATIONS = [15, 30, 45, 60] as const

/** Nastavení dostupnosti: týdenní okna (po jednom na den), blokované časy a režim potvrzování. */
export const availabilitySettingsSchema = z.object({
  bookingEnabled: z.boolean(),
  autoConfirm: z.boolean(),
  weekly: z
    .array(
      z.object({
        day_of_week: z.number().int().min(0).max(6),
        enabled: z.boolean(),
        start_time: time,
        end_time: time,
        slot_duration_minutes: z.number().int().refine((n) => (SLOT_DURATIONS as readonly number[]).includes(n), 'Invalid slot length'),
      })
    )
    .length(7),
  blocks: z
    .array(
      z.object({
        date: dateStr,
        start_time: time,
        end_time: time,
        note: z.string().trim().max(200).nullish(),
      })
    )
    .max(200),
})
export type AvailabilitySettings = z.infer<typeof availabilitySettingsSchema>
