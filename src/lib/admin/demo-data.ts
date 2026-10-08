import 'server-only'
import type { TranscriptMessage } from '@/types'
import { zonedToUtc as zonedToUtcLocal } from '@/lib/bookings/time'

// Demo hovory jsou běžné řádky v call_logs označené metadata.demo = true; podle toho se i mažou.
// Do počítadel minut se nezapočítávají (vkládáme přímo do tabulky, ne přes increment_minutes_used).

type Line = [role: 'assistant' | 'user', text: string]
interface Scenario {
  /** Hovor skončil rezervací: z něj vznikne i demo rezervace (propojená přes call_log_id). */
  booking?: { name: string; title: string }
  status: 'completed' | 'transferred' | 'missed'
  endedReason: string
  summary: string
  lines: Line[]
}

const CS: Scenario[] = [
  {
    booking: { name: 'Jan Novák', title: 'Základní prohlídka' },
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
  {
    booking: { name: 'Petra Svobodová', title: 'Kontrola a čištění' },
    status: 'completed',
    endedReason: 'assistant-ended-call',
    summary: 'Nový klient se objednal na kontrolu a čištění. Termín čeká na potvrzení.',
    lines: [
      ['assistant', 'Dobrý den, tady Aida. Jak vám mohu pomoci?'],
      ['user', 'Dobrý den, ráda bych se objednala na kontrolu a čištění, ještě jsem u vás nebyla.'],
      ['assistant', 'Vítejte, s radostí vás objednám. Hodí se vám spíš dopoledne, nebo odpoledne?'],
      ['user', 'Spíš dopoledne, nejlépe kolem desáté.'],
      ['assistant', 'Mám volno v 10:00 i v 10:30. Který čas zvolíte?'],
      ['user', 'Deset hodin, prosím.'],
      ['assistant', 'Zapsáno. Prosím o vaše jméno a telefon.'],
      ['user', 'Petra Svobodová, nula sedm sedm sedm, jedna dva tři, čtyři pět šest.'],
      ['assistant', 'Děkuji, paní Svobodová. Rezervaci vám majitel brzy potvrdí. Přeji hezký den.'],
    ],
  },
]

const EN: Scenario[] = [
  {
    booking: { name: 'Jan Novak', title: 'Basic check-up' },
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
  {
    booking: { name: 'Petra Svoboda', title: 'Check-up and cleaning' },
    status: 'completed',
    endedReason: 'assistant-ended-call',
    summary: 'New patient booked a check-up and cleaning. Waiting for confirmation.',
    lines: [
      ['assistant', 'Hello, this is Aida. How can I help you?'],
      ['user', "Hi, I'd like to book a check-up and cleaning, I haven't been to you before."],
      ['assistant', 'Welcome, I would be glad to. Would you prefer the morning or the afternoon?'],
      ['user', 'The morning, around ten if possible.'],
      ['assistant', 'I have 10:00 and 10:30 available. Which one suits you?'],
      ['user', '10:00 please.'],
      ['assistant', 'Booked. May I have your name and phone number?'],
      ['user', 'Petra Svoboda, zero seven seven seven, one two three, four five six.'],
      ['assistant', 'Thank you, Ms. Svoboda. The business will confirm your booking shortly. Have a nice day.'],
    ],
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
      metadata: s.booking ? { demo: true, demo_booking: s.booking } : { demo: true },
      created_at: startedAt.toISOString(),
    }
  })
}

interface InsertedCall {
  id: string
  started_at: string | null
  metadata: Record<string, unknown> | null
}

// Dopolední a odpolední začátky po půlhodinách (rezervace trvají 30 min, takže se nikdy nepřekrývají).
const START_TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00']

/**
 * Demo rezervace: jedna pro každý demo hovor, který skončil rezervací (propojená přes call_log_id), plus několik ručně
 * zadaných. Od dnešního dne se rozkládají dopředu i dozadu. Značka `external_id = 'demo:…'` je odliší od skutečných
 * (sync do kalendářů je přeskočí) a podle ní se při vypnutí smažou.
 */
export function buildDemoBookings(workspaceId: string, agentId: string, locale: string, calls: InsertedCall[], tz: string) {
  const cs = locale === 'cs' || locale === 'sk'
  const used = new Set<string>()
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
  const dayPlus = (n: number) => {
    const [y, m, d] = todayStr.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d + n, 12))
    return dt.toISOString().slice(0, 10)
  }
  const pick = (seed: number, dayOffset: number) => {
    for (let a = 0; a < START_TIMES.length * 14; a++) {
      const off = dayOffset + Math.floor(a / START_TIMES.length)
      const time = START_TIMES[(Math.floor(rnd(seed + 3) * START_TIMES.length) + a) % START_TIMES.length]
      const date = dayPlus(off)
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay()
      if (dow === 0 || dow === 6 || used.has(`${date}${time}`)) continue
      used.add(`${date}${time}`)
      return zonedToUtcLocal(date, time, tz)
    }
    return zonedToUtcLocal(dayPlus(dayOffset), '12:00', tz)
  }

  const rows: Record<string, unknown>[] = []
  const add = (i: number, name: string, phone: string, title: string, dayOffset: number, status: 'confirmed' | 'pending' | 'cancelled', callId: string | null, notes: string | null, createdAt?: string | null) => {
    const start = pick(i * 7, dayOffset)
    rows.push({
      workspace_id: workspaceId,
      agent_id: agentId,
      caller_name: name,
      caller_phone: phone,
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 30 * 60_000).toISOString(),
      title,
      notes,
      status,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
      cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
      call_log_id: callId,
      external_id: `demo:${workspaceId}:${i}`,
      // Vytvořeno v den hovoru (nebo v minulosti u ručních), ať grafy na přehledu nevypadají jako jeden skok.
      ...(createdAt ? { created_at: createdAt } : {}),
    })
  }

  // Z hovorů: nejnovější hovory dostanou nejbližší termíny; každá čtvrtá čeká na potvrzení.
  const booked = calls.filter((c) => c.metadata && typeof c.metadata.demo_booking === 'object').sort((a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? ''))
  booked.forEach((c, i) => {
    const b = c.metadata!.demo_booking as { name: string; title: string }
    add(i, b.name, `+4207${String(10000000 + Math.floor(rnd(i + 31) * 89999999)).slice(0, 8)}`, b.title, 1 + i, i % 4 === 3 ? 'pending' : 'confirmed', c.id, cs ? 'Rezervováno AI recepční během hovoru.' : 'Booked by the AI receptionist during the call.', c.started_at)
  })

  // Ručně zadané (např. telefonát na pobočku), včetně jedné zrušené.
  const manual: [string, string, string, number, 'confirmed' | 'pending' | 'cancelled'][] = cs
    ? [
        ['Marie Dvořáková', '+420777100200', 'Kontrola', 2, 'confirmed'],
        ['Tomáš Černý', '+420602300400', 'Konzultace', 3, 'pending'],
        ['Eva Procházková', '+420731500600', 'Základní prohlídka', 4, 'confirmed'],
        ['Martin Král', '+420608700800', 'Kontrola a čištění', 6, 'cancelled'],
        ['Lucie Horáková', '+420775900100', 'Konzultace', -2, 'confirmed'],
        ['Pavel Veselý', '+420603200300', 'Základní prohlídka', -4, 'confirmed'],
      ]
    : [
        ['Mary Dwyer', '+420777100200', 'Check-up', 2, 'confirmed'],
        ['Tom Black', '+420602300400', 'Consultation', 3, 'pending'],
        ['Eve Proctor', '+420731500600', 'Basic check-up', 4, 'confirmed'],
        ['Martin King', '+420608700800', 'Check-up and cleaning', 6, 'cancelled'],
        ['Lucy Hart', '+420775900100', 'Consultation', -2, 'confirmed'],
        ['Paul Vesely', '+420603200300', 'Basic check-up', -4, 'confirmed'],
      ]
  manual.forEach(([name, phone, title, off, status], k) => add(100 + k, name, phone, title, off, status, null, null, new Date(Date.now() - (2 + k * 3) * 86_400_000).toISOString()))
  return rows
}
