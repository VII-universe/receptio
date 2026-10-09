import { z } from 'zod'

/** Zdroj rezervací (stůl, křeslo, místnost…). */
export const resourceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(['table', 'chair', 'room', 'seat', 'custom']).default('custom'),
  capacity: z.number().int().min(1).max(1000).default(1),
  description: z.string().trim().max(300).nullish(),
  is_active: z.boolean().optional(),
})

export const resourcePatchSchema = resourceSchema.partial().extend({ sort_order: z.number().int().min(0).max(100000).optional() })
