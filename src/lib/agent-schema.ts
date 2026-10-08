import { z } from 'zod'
import { isLanguageCode } from '@/lib/languages'

export const agentSchema = z.object({
  name: z.string().trim().min(1, 'Enter the agent name').max(50, 'Maximum 50 characters'),
  firstMessage: z.string().trim().min(1, 'Enter a greeting message').max(500, 'Maximum 500 characters'),
  systemPrompt: z.string().trim().min(1, 'Enter a system prompt').max(10000, 'Maximum 10,000 characters'),
  language: z.string().refine(isLanguageCode, 'Invalid language'),
  voiceId: z
    .string()
    .min(1, 'Select a voice')
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid voice ID'),
  endCallPhrases: z.array(z.string().trim().min(1).max(50)).max(20, 'Maximum 20 phrases'),
  // Chování příchozích hovorů; když chybí (onboarding, starší klienti), zůstane stávající hodnota agenta.
  aiDisclosure: z.boolean().optional(),
  ringsBeforeAnswer: z.number().int().min(0).max(4).optional(),
  maxCallDurationMinutes: z.number().int().min(1).max(720).nullable().optional(),
})

export type AgentFormData = z.infer<typeof agentSchema>
