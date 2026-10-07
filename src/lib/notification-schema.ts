import { z } from 'zod'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const E164 = /^\+[1-9]\d{7,14}$/

/** Telefon smí obsahovat mezery ("+420 777 123 456"); pro kontrolu a uložení se odstraní. */
export const normalizePhone = (v: string) => v.replace(/\s+/g, '')

export const notificationFormSchema = z.object({
  email: z.string().trim().refine((v) => v === '' || EMAIL.test(v), 'Enter a valid email address'),
  sms: z
    .string()
    .refine((v) => v.trim() === '' || E164.test(normalizePhone(v)), 'Enter the phone number like +420777123456'),
  enabled: z.boolean(),
})

export type NotificationFormData = z.infer<typeof notificationFormSchema>
export { EMAIL, E164 }
