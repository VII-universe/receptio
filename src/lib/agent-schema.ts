import { z } from 'zod'
import { isLanguageCode } from '@/lib/languages'

export const agentSchema = z.object({
  name: z.string().trim().min(1, 'Zadejte jméno agenta').max(50, 'Maximálně 50 znaků'),
  firstMessage: z.string().trim().min(1, 'Zadejte uvítací zprávu').max(500, 'Maximálně 500 znaků'),
  systemPrompt: z.string().trim().min(1, 'Zadejte systémový prompt').max(10000, 'Maximálně 10 000 znaků'),
  language: z.string().refine(isLanguageCode, 'Neplatný jazyk'),
  voiceId: z
    .string()
    .min(1, 'Vyberte hlas')
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, 'Neplatné ID hlasu'),
  endCallPhrases: z.array(z.string().trim().min(1).max(50)).max(20, 'Maximálně 20 frází'),
})

export type AgentFormData = z.infer<typeof agentSchema>
