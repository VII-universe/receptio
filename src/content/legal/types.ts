export interface LegalSection {
  heading: string
  paragraphs?: string[]
  items?: string[]
  /** Odstavce za seznamem. */
  after?: string[]
}

export interface LegalDoc {
  title: string
  intro?: string
  sections: LegalSection[]
}

/** Subdodavatelé (zpracovatelé), kteří se podílejí na provozu služby. Seznam musí odpovídat skutečně používaným službám. */
export const SUBPROCESSORS = [
  { name: 'Supabase', cs: 'databáze (region EU, Frankfurt)', en: 'database (EU region, Frankfurt)' },
  { name: 'Vercel', cs: 'hosting aplikace', en: 'application hosting' },
  { name: 'Clerk', cs: 'přihlášení a správa uživatelských účtů', en: 'sign-in and user account management' },
  { name: 'Stripe', cs: 'platby a fakturace předplatného', en: 'payments and subscription billing' },
  { name: 'Vapi', cs: 'řízení hlasových hovorů AI asistenta, nahrávky a přepisy', en: 'voice call orchestration for the AI assistant, recordings and transcripts' },
  { name: 'Twilio', cs: 'telefonní čísla a telekomunikační provoz', en: 'phone numbers and telecommunications' },
  { name: 'ElevenLabs', cs: 'syntéza hlasu asistenta', en: 'voice synthesis for the assistant' },
  { name: 'OpenAI', cs: 'jazykový model, který formuluje odpovědi asistenta', en: 'language model that generates the assistant’s replies' },
  { name: 'Deepgram', cs: 'přepis řeči volajícího na text', en: 'speech-to-text transcription of the caller' },
  { name: 'Resend', cs: 'odesílání e-mailů (shrnutí hovorů, upozornění)', en: 'sending emails (call summaries, notifications)' },
] as const
