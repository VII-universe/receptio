import 'server-only'
import type { TranscriptMessage } from '@/types'

// Demo hovory jsou běžné řádky v call_logs označené metadata.demo = true; podle toho se i mažou.
// Do počítadel minut se nezapočítávají (vkládáme přímo do tabulky, ne přes increment_minutes_used).

type Line = [role: 'assistant' | 'user', text: string]
interface Scenario {
  status: 'completed' | 'transferred' | 'missed'
  endedReason: string
  summary: string
  lines: Line[]
}

const CS: Scenario[] = [
  {
    status: 'completed',
    endedReason: 'customer-ended-call',
    summary: 'Volající si objednal termín na čtvrtek v 15:30. Potvrzeno, jméno a telefon uloženy.',
    lines: [
      ['assistant', 'Dobrý den, tady Aida, virtuální recepční. Jak vám mohu pomoci?'],
      ['user', 'Dobrý den, chtěl bych se objednat na čtvrtek odpoledne.'],
      ['assistant', 'Rád to zařídím. Ve čtvrtek mám volno v 15:30 nebo v 16:30. Který čas vám vyhovuje?'],
      ['user', 'Půl čtvrté by bylo skvělé.'],
      ['assistant', 'Výborně, zapsáno na čtvrtek v 15:30. Můžu poprosit o vaše jméno?'],
      ['user', 'Novák, Jan Novák.'],
      ['assistant', 'Děkuji, pane Nováku. Potvrzení vám pošleme SMS. Hezký den!'],
    ],
  },
  {
    status: 'completed',
    endedReason: 'assistant-ended-call',
    summary: 'Dotaz na otevírací dobu o víkendu. Informace poskytnuta, bez dalšího požadavku.',
    lines: [
      ['assistant', 'Dobrý den, tady Aida. S čím vám mohu pomoci?'],
      ['user', 'Zajímalo by mě, jestli máte otevřeno v sobotu.'],
      ['assistant', 'V sobotu máme otevřeno od 9:00 do 13:00. V neděli je zavřeno.'],
      ['user', 'Super, děkuji, to mi stačí.'],
      ['assistant', 'Rádo se stalo, přejeme hezký den.'],
    ],
  },
  {
    status: 'transferred',
    endedReason: 'assistant-forwarded-call',
    summary: 'Volající požadoval mluvit s majitelem kvůli reklamaci. Hovor přepojen na pobočku.',
    lines: [
      ['assistant', 'Dobrý den, tady Aida. Jak vám mohu pomoci?'],
      ['user', 'Mám reklamaci k poslední zakázce a potřebuju mluvit s vedoucím.'],
      ['assistant', 'Rozumím. Přepojím vás na kolegu, který se reklamacím věnuje. Okamžik prosím.'],
    ],
  },
  {
    status: 'completed',
    endedReason: 'customer-ended-call',
    summary: 'Dotaz na cenu základní služby. Volající zvažuje a ozve se později.',
    lines: [
      ['assistant', 'Dobrý den, tady Aida. Jak vám mohu pomoci?'],
      ['user', 'Kolik by stála základní prohlídka?'],
      ['assistant', 'Základní prohlídka stojí 890 korun a trvá zhruba půl hodiny.'],
      ['user', 'Dobře, ještě si to rozmyslím a ozvu se.'],
      ['assistant', 'Samozřejmě, budeme se těšit. Na shledanou.'],
    ],
  },
  {
    status: 'missed',
    endedReason: 'voicemail',
    summary: 'Volající nechal vzkaz, bez dalších informací.',
    lines: [],
  },
]

const EN: Scenario[] = [
  {
    status: 'completed',
    endedReason: 'customer-ended-call',
    summary: 'Caller booked an appointment for Thursday at 3:30 pm. Confirmed; name and phone saved.',
    lines: [
      ['assistant', "Hello, this is Aida, the virtual receptionist. How can I help you?"],
      ['user', "Hi, I'd like to book something for Thursday afternoon."],
      ['assistant', "Happy to help. On Thursday I have 3:30 pm or 4:30 pm available. Which works for you?"],
      ['user', '3:30 would be great.'],
      ['assistant', "Perfect, you're booked for Thursday at 3:30 pm. May I have your name?"],
      ['user', 'Jan Novak.'],
      ['assistant', "Thank you, Mr. Novak. We'll send you a text confirmation. Have a great day!"],
    ],
  },
  {
    status: 'completed',
    endedReason: 'assistant-ended-call',
    summary: 'Question about weekend opening hours. Answered, no further request.',
    lines: [
      ['assistant', 'Hello, this is Aida. How can I help?'],
      ['user', 'Are you open on Saturday?'],
      ['assistant', "On Saturdays we're open from 9 am to 1 pm. We're closed on Sundays."],
      ['user', "Great, thanks, that's all I needed."],
      ['assistant', 'My pleasure, have a nice day.'],
    ],
  },
  {
    status: 'transferred',
    endedReason: 'assistant-forwarded-call',
    summary: 'Caller wanted the owner regarding a complaint. Call transferred to the front desk.',
    lines: [
      ['assistant', 'Hello, this is Aida. How can I help you?'],
      ['user', 'I have a complaint about my last order and need to speak to a manager.'],
      ['assistant', "I understand. I'll transfer you to a colleague who handles complaints. One moment please."],
    ],
  },
  {
    status: 'completed',
    endedReason: 'customer-ended-call',
    summary: 'Pricing question for the basic service. Caller will think it over and call back.',
    lines: [
      ['assistant', 'Hello, this is Aida. How can I help you?'],
      ['user', 'How much is a basic check-up?'],
      ['assistant', 'A basic check-up is 39 euros and takes about half an hour.'],
      ['user', "Okay, I'll think about it and get back to you."],
      ['assistant', "Of course, we'd be happy to see you. Goodbye."],
    ],
  },
  {
    status: 'missed',
    endedReason: 'voicemail',
    summary: 'Caller left a voicemail with no further details.',
    lines: [],
  },
]

const DEMO_CALLS = 28
const DAY_MS = 24 * 60 * 60 * 1000

/** Deterministické "náhodné" číslo, ať jsou demo data při každém zapnutí stejná. */
const rnd = (n: number) => {
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

/** Řádky call_logs pro demo hovory za posledních ~14 dní. */
export function buildDemoCalls(workspaceId: string, agentId: string, locale: string) {
  const scenarios = locale === 'cs' || locale === 'sk' ? CS : EN
  const now = Date.now()
  return Array.from({ length: DEMO_CALLS }, (_, i) => {
    const s = scenarios[Math.floor(rnd(i + 1) * scenarios.length)]
    const daysAgo = Math.floor((i / DEMO_CALLS) * 14 + rnd(i + 50))
    // Pracovní doba 8–18 h, od nejnovějších po nejstarší.
    const startedAt = new Date(now - daysAgo * DAY_MS - Math.floor(rnd(i + 99) * 6 * 3600_000) - 5 * 60_000)
    startedAt.setHours(8 + Math.floor(rnd(i + 7) * 10), Math.floor(rnd(i + 13) * 60), 0, 0)
    if (startedAt.getTime() > now) startedAt.setTime(now - (i + 1) * 20 * 60_000)
    const duration = s.lines.length === 0 ? 12 + Math.floor(rnd(i + 3) * 20) : 25 + s.lines.length * 9 + Math.floor(rnd(i + 5) * 25)
    let t = 2
    const transcriptJson: TranscriptMessage[] = s.lines.map(([role, message]) => {
      const m: TranscriptMessage = { role, message, time: startedAt.getTime() + t * 1000, secondsFromStart: t }
      t += Math.max(4, Math.round(message.length / 14))
      return m
    })
    return {
      workspace_id: workspaceId,
      agent_id: agentId,
      vapi_call_id: `demo-${workspaceId}-${i}`,
      caller_number: `+4207${String(10000000 + Math.floor(rnd(i + 21) * 89999999)).slice(0, 8)}`,
      duration_seconds: duration,
      status: s.status,
      summary: s.summary,
      transcript: transcriptJson.map((m) => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.message}`).join('\n') || null,
      transcript_json: transcriptJson.length ? transcriptJson : null,
      recording_url: null,
      started_at: startedAt.toISOString(),
      ended_at: new Date(startedAt.getTime() + duration * 1000).toISOString(),
      ended_reason: s.endedReason,
      cost: Math.round(duration * 0.0015 * 10000) / 10000,
      cost_cents: 0,
      metadata: { demo: true },
      created_at: startedAt.toISOString(),
    }
  })
}
