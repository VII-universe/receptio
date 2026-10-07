import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { formatLocalizedDateTime } from '@/lib/email/format'
import { colors, EmailLayout, fontFamily } from './components/layout'
import { intlLocale, pickLocale } from './i18n'

export interface CallSummaryEmailProps {
  workspaceId: string
  agentName: string
  callerNumber: string // nebo "Unknown"
  duration: string // "2:34"
  startedAt: Date
  summary: string | null
  transcript: { role: 'agent' | 'customer'; text: string }[]
  callId: string
  dashboardUrl: string
  locale: string
}

interface Texts {
  subject: (agent: string, caller: string) => string
  title: string
  caller: string
  duration: string
  agent: string
  summary: string
  transcript: string
  customer: string
  unknown: string
  more: string
  button: string
  manage: string
  footer: string
}

const T: Record<string, Texts> & { en: Texts } = {
  cs: {
    subject: (a, c) => `📞 Nový hovor od ${c} – ${a}`,
    title: 'Nový hovor', caller: 'Volající', duration: 'Délka hovoru', agent: 'Agent', summary: 'Shrnutí', transcript: 'Přepis',
    customer: 'Zákazník', unknown: 'Neznámé číslo', more: 'Zobrazit celý přepis', button: 'Zobrazit detail hovoru',
    manage: 'Spravovat oznámení', footer: 'Receptio · AI hlasový recepční pro malé firmy',
  },
  en: {
    subject: (a, c) => `📞 New call from ${c} – ${a}`,
    title: 'New call', caller: 'Caller', duration: 'Duration', agent: 'Agent', summary: 'Summary', transcript: 'Transcript',
    customer: 'Customer', unknown: 'Unknown', more: 'View full transcript', button: 'View call details',
    manage: 'Manage notifications', footer: 'Receptio · AI receptionist for small businesses',
  },
  de: {
    subject: (a, c) => `📞 Neuer Anruf von ${c} – ${a}`,
    title: 'Neuer Anruf', caller: 'Anrufer', duration: 'Dauer', agent: 'Agent', summary: 'Zusammenfassung', transcript: 'Transkript',
    customer: 'Kunde', unknown: 'Unbekannt', more: 'Vollständiges Transkript ansehen', button: 'Anrufdetails ansehen',
    manage: 'Benachrichtigungen verwalten', footer: 'Receptio · KI-Telefonassistent für kleine Unternehmen',
  },
  pl: {
    subject: (a, c) => `📞 Nowe połączenie od ${c} – ${a}`,
    title: 'Nowe połączenie', caller: 'Dzwoniący', duration: 'Czas trwania', agent: 'Agent', summary: 'Podsumowanie', transcript: 'Transkrypcja',
    customer: 'Klient', unknown: 'Nieznany', more: 'Zobacz pełną transkrypcję', button: 'Zobacz szczegóły połączenia',
    manage: 'Zarządzaj powiadomieniami', footer: 'Receptio · głosowy recepcjonista AI dla małych firm',
  },
  sk: {
    subject: (a, c) => `📞 Nový hovor od ${c} – ${a}`,
    title: 'Nový hovor', caller: 'Volajúci', duration: 'Dĺžka hovoru', agent: 'Agent', summary: 'Zhrnutie', transcript: 'Prepis',
    customer: 'Zákazník', unknown: 'Neznáme', more: 'Zobraziť celý prepis', button: 'Zobraziť detail hovoru',
    manage: 'Spravovať oznámenia', footer: 'Receptio · AI hlasový recepčný pre malé firmy',
  },
  fr: {
    subject: (a, c) => `📞 Nouvel appel de ${c} – ${a}`,
    title: 'Nouvel appel', caller: 'Appelant', duration: 'Durée', agent: 'Agent', summary: 'Résumé', transcript: 'Transcription',
    customer: 'Client', unknown: 'Inconnu', more: 'Voir la transcription complète', button: "Voir les détails de l'appel",
    manage: 'Gérer les notifications', footer: 'Receptio · réceptionniste vocal IA pour les petites entreprises',
  },
}

const MAX_TURNS = 8
const card = { backgroundColor: colors.card, borderRadius: '8px', padding: '16px' }
const label = { margin: 0, color: colors.muted, fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const value = { margin: '4px 0 0', color: colors.text, fontSize: '18px', fontWeight: 700 }

export const callSummarySubject = (locale: string, agentName: string, callerNumber: string | null) => {
  const t = pickLocale(T, locale)
  return t.subject(agentName, callerNumber || t.unknown)
}

export function CallSummaryEmail({
  agentName,
  callerNumber,
  duration,
  startedAt,
  summary,
  transcript,
  dashboardUrl,
  locale,
}: CallSummaryEmailProps) {
  const t = pickLocale(T, locale)
  const caller = callerNumber && callerNumber !== 'Unknown' ? callerNumber : t.unknown
  const turns = transcript.slice(0, MAX_TURNS)
  const hasMore = transcript.length > MAX_TURNS

  return (
    <EmailLayout
      lang={intlLocale(T, locale)}
      preview={t.subject(agentName, caller)}
      footer={t.footer}
      footerLink={{ href: `${dashboardUrl.split('/dashboard')[0]}/dashboard/settings?tab=notifikace`, label: t.manage }}
    >
      <Heading as="h1" style={{ margin: 0, fontSize: '28px', lineHeight: '34px', color: colors.text }}>
        {t.title}
      </Heading>
      <Text style={{ margin: '8px 0 24px', color: colors.muted, fontSize: '14px' }}>
        {agentName} · {formatLocalizedDateTime(startedAt, intlLocale(T, locale))}
      </Text>

      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
              <Section style={card}>
                <Text style={label}>{t.caller}</Text>
                <Text style={value}>{caller}</Text>
              </Section>
            </td>
            <td style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
              <Section style={card}>
                <Text style={label}>{t.duration}</Text>
                <Text style={value}>{duration}</Text>
              </Section>
            </td>
          </tr>
        </tbody>
      </table>

      {summary?.trim() && (
        <Section style={{ ...card, marginTop: '16px' }}>
          <Text style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>{t.summary}</Text>
          <Text style={{ margin: '8px 0 0', fontSize: '14px', lineHeight: '22px', whiteSpace: 'pre-wrap' }}>{summary.trim()}</Text>
        </Section>
      )}

      {turns.length > 0 && (
        <Section style={{ marginTop: '16px' }}>
          <Text style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700 }}>{t.transcript}</Text>
          <Section style={{ ...card, border: `1px solid ${colors.border}` }}>
            {turns.map((m, i) => (
              <Text key={i} style={{ margin: '0 0 6px', fontSize: '13px', lineHeight: '19px', whiteSpace: 'pre-wrap' }}>
                <strong>{m.role === 'agent' ? t.agent : t.customer}:</strong> {m.text}
              </Text>
            ))}
            {hasMore && (
              <Text style={{ margin: '8px 0 0', fontSize: '12px' }}>
                <Link href={dashboardUrl} style={{ color: colors.brand }}>
                  {t.more}
                </Link>
              </Text>
            )}
          </Section>
        </Section>
      )}

      <Section style={{ marginTop: '28px', textAlign: 'center' }}>
        <Button
          href={dashboardUrl}
          style={{ backgroundColor: colors.brand, color: '#ffffff', fontFamily, fontSize: '14px', fontWeight: 700, padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }}
        >
          {t.button}
        </Button>
      </Section>
    </EmailLayout>
  )
}

export default CallSummaryEmail
