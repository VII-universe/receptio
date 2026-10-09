import { z } from 'zod'
import { isValidPhone, normalizePhoneValue } from './phone'
import { isDate, isTime } from './time'

// Prázdné políčko = bez čísla; vyplněné musí být opravdové telefonní číslo (žádná písmena).
const phone = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().max(40).refine(isValidPhone, 'Invalid phone number').transform(normalizePhoneValue).nullable()
)

const iso = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date-time')

const STATUSES = ['pending', 'confirmed', 'cancelled', 'no_show'] as const
const partySize = z.number().int().min(1).max(1000)
const email = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().trim().email().max(200).nullable())

/** Přijímá jména polí z rozhraní (customer_*) i původní (caller_*). */
const aliasCustomer = (input: unknown) => {
  if (typeof input !== 'object' || input === null) return input
  const o = { ...(input as Record<string, unknown>) }
  if (o.caller_name === undefined && o.customer_name !== undefined) o.caller_name = o.customer_name
  if (o.caller_phone === undefined && o.customer_phone !== undefined) o.caller_phone = o.customer_phone
  if (o.vapi_call_id === undefined && o.call_id !== undefined) o.vapi_call_id = o.call_id
  return o
}

export const newBookingSchema = z.preprocess(
  aliasCustomer,
  z.object({
    caller_name: z.string().trim().min(1).max(120),
    caller_phone: phone.optional(),
    customer_email: email.optional(),
    starts_at: iso,
    ends_at: iso.nullish(),
    title: z.string().trim().min(1).max(200).default('Booking'),
    notes: z.string().trim().max(2000).nullish(),
    status: z.enum(STATUSES).optional(),
    party_size: partySize.optional(),
    resource_id: z.string().uuid().nullish(),
    source: z.enum(['phone', 'web', 'manual']).optional(),
    vapi_call_id: z.string().trim().max(200).nullish(),
  })
)

export const bookingPatchSchema = z.preprocess(
  aliasCustomer,
  z.object({
    status: z.enum(STATUSES).optional(),
    starts_at: iso.optional(),
    ends_at: iso.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    caller_name: z.string().trim().min(1).max(120).optional(),
    caller_phone: phone.optional(),
    customer_email: email.optional(),
    agent_id: z.string().uuid().optional(),
    party_size: partySize.optional(),
    resource_id: z.string().uuid().nullable().optional(),
  })
)

const time = z.string().refine(isTime, 'HH:MM')
const dateStr = z.string().refine(isDate, 'YYYY-MM-DD')

export const SLOT_DURATIONS = [15, 30, 45, 60, 90, 120] as const

/** Nastavení dostupnosti: týdenní okna (po jednom na den), blokované časy a režim potvrzování. */
export const availabilitySettingsSchema = z.object({
  bookingEnabled: z.boolean(),
  autoConfirm: z.boolean(),
  notifyCustomer: z.boolean().optional(),
  bookingMode: z.enum(['capacity', 'resource']).optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
  advanceDays: z.number().int().min(1).max(365).optional(),
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
