import { Button, Heading, Section, Text } from '@react-email/components'
import { colors, EmailLayout } from './components/layout'
import { intlLocale, pickLocale } from './i18n'

export interface NewBookingEmailProps {
  locale: string
  agentName: string
  callerName: string
  callerPhone: string | null
  title: string
  when: string // už naformátované v zóně workspace
  notes: string | null
  needsConfirmation: boolean
  confirmUrl: string | null
  cancelUrl: string | null
  calendarUrl: string
}

interface Texts {
  subjectPending: (name: string, when: string) => string
  subjectConfirmed: (name: string, when: string) => string
  titlePending: string
  titleConfirmed: string
  introPending: (agent: string) => string
  introConfirmed: (agent: string) => string
  who: string
  phone: string
  what: string
  when: string
  notes: string
  confirm: string
  cancel: string
  calendar: string
  footer: string
}

const T: Record<string, Texts> & { en: Texts } = {
  cs: {
    subjectPending: (n, w) => `🗓️ Nová rezervace čeká na potvrzení: ${n}, ${w}`,
    subjectConfirmed: (n, w) => `🗓️ Nová rezervace: ${n}, ${w}`,
    titlePending: 'Rezervace čeká na potvrzení',
    titleConfirmed: 'Nová rezervace',
    introPending: (a) => `Agent ${a} přijal rezervaci, kterou je třeba potvrdit. Zákazník zatím ví jen, že se mu brzy ozvete.`,
    introConfirmed: (a) => `Agent ${a} domluvil novou rezervaci. Je rovnou potvrzená.`,
    who: 'Zákazník', phone: 'Telefon', what: 'Důvod návštěvy', when: 'Termín', notes: 'Poznámky',
    confirm: 'Potvrdit rezervaci', cancel: 'Zamítnout', calendar: 'Otevřít kalendář',
    footer: 'Receptio · AI hlasový recepční pro malé firmy',
  },
  en: {
    subjectPending: (n, w) => `🗓️ New booking awaiting confirmation: ${n}, ${w}`,
    subjectConfirmed: (n, w) => `🗓️ New booking: ${n}, ${w}`,
    titlePending: 'Booking awaiting confirmation',
    titleConfirmed: 'New booking',
    introPending: (a) => `Agent ${a} took a booking that needs your confirmation. The customer only knows you'll get back to them shortly.`,
    introConfirmed: (a) => `Agent ${a} booked a new appointment. It is confirmed already.`,
    who: 'Customer', phone: 'Phone', what: 'Reason for visit', when: 'When', notes: 'Notes',
    confirm: 'Confirm booking', cancel: 'Decline', calendar: 'Open calendar',
    footer: 'Receptio · AI receptionist for small businesses',
  },
  sk: {
    subjectPending: (n, w) => `🗓️ Nová rezervácia čaká na potvrdenie: ${n}, ${w}`,
    subjectConfirmed: (n, w) => `🗓️ Nová rezervácia: ${n}, ${w}`,
    titlePending: 'Rezervácia čaká na potvrdenie',
    titleConfirmed: 'Nová rezervácia',
    introPending: (a) => `Agent ${a} prijal rezerváciu, ktorú treba potvrdiť. Zákazník zatiaľ vie len, že sa mu čoskoro ozvete.`,
    introConfirmed: (a) => `Agent ${a} dohodol novú rezerváciu. Je rovno potvrdená.`,
    who: 'Zákazník', phone: 'Telefón', what: 'Dôvod návštevy', when: 'Termín', notes: 'Poznámky',
    confirm: 'Potvrdiť rezerváciu', cancel: 'Zamietnuť', calendar: 'Otvoriť kalendár',
    footer: 'Receptio · AI hlasový recepčný pre malé firmy',
  },
  de: {
    subjectPending: (n, w) => `🗓️ Neue Buchung wartet auf Bestätigung: ${n}, ${w}`,
    subjectConfirmed: (n, w) => `🗓️ Neue Buchung: ${n}, ${w}`,
    titlePending: 'Buchung wartet auf Bestätigung',
    titleConfirmed: 'Neue Buchung',
    introPending: (a) => `Agent ${a} hat eine Buchung angenommen, die Sie bestätigen müssen. Der Kunde weiß nur, dass Sie sich melden.`,
    introConfirmed: (a) => `Agent ${a} hat einen neuen Termin vereinbart. Er ist bereits bestätigt.`,
    who: 'Kunde', phone: 'Telefon', what: 'Anlass', when: 'Termin', notes: 'Notizen',
    confirm: 'Buchung bestätigen', cancel: 'Ablehnen', calendar: 'Kalender öffnen',
    footer: 'Receptio · KI-Telefonassistent für kleine Unternehmen',
  },
  pl: {
    subjectPending: (n, w) => `🗓️ Nowa rezerwacja czeka na potwierdzenie: ${n}, ${w}`,
    subjectConfirmed: (n, w) => `🗓️ Nowa rezerwacja: ${n}, ${w}`,
    titlePending: 'Rezerwacja czeka na potwierdzenie',
    titleConfirmed: 'Nowa rezerwacja',
    introPending: (a) => `Agent ${a} przyjął rezerwację, którą trzeba potwierdzić. Klient wie tylko, że wkrótce się z nim skontaktujecie.`,
    introConfirmed: (a) => `Agent ${a} umówił nową wizytę. Jest już potwierdzona.`,
    who: 'Klient', phone: 'Telefon', what: 'Powód wizyty', when: 'Termin', notes: 'Notatki',
    confirm: 'Potwierdź rezerwację', cancel: 'Odrzuć', calendar: 'Otwórz kalendarz',
    footer: 'Receptio · głosowy recepcjonista AI dla małych firm',
  },
}

export const newBookingSubject = (locale: string, needsConfirmation: boolean, name: string, when: string) => {
  const t = pickLocale(T, locale)
  return needsConfirmation ? t.subjectPending(name, when) : t.subjectConfirmed(name, when)
}

const card = { backgroundColor: colors.card, borderRadius: '8px', padding: '16px' }
const label = { margin: 0, color: colors.muted, fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const value = { margin: '4px 0 12px', color: colors.text, fontSize: '16px', fontWeight: 700 }

export function NewBookingEmail(p: NewBookingEmailProps) {
  const t = pickLocale(T, p.locale)
  const title = p.needsConfirmation ? t.titlePending : t.titleConfirmed
  return (
    <EmailLayout lang={intlLocale(T, p.locale)} preview={`${title}: ${p.callerName}, ${p.when}`} footer={t.footer}>
      <Heading as="h1" style={{ margin: 0, fontSize: '26px', lineHeight: '32px', color: colors.text }}>
        {title}
      </Heading>
      <Text style={{ margin: '8px 0 20px', color: colors.muted, fontSize: '14px' }}>{p.needsConfirmation ? t.introPending(p.agentName) : t.introConfirmed(p.agentName)}</Text>

      <Section style={card}>
        <Text style={label}>{t.when}</Text>
        <Text style={value}>{p.when}</Text>
        <Text style={label}>{t.who}</Text>
        <Text style={value}>{p.callerName}</Text>
        {p.callerPhone && (
          <>
            <Text style={label}>{t.phone}</Text>
            <Text style={value}>{p.callerPhone}</Text>
          </>
        )}
        <Text style={label}>{t.what}</Text>
        <Text style={{ ...value, marginBottom: p.notes ? 12 : 0 }}>{p.title}</Text>
        {p.notes && (
          <>
            <Text style={label}>{t.notes}</Text>
            <Text style={{ ...value, marginBottom: 0, fontWeight: 400, whiteSpace: 'pre-wrap' }}>{p.notes}</Text>
          </>
        )}
      </Section>

      <Section style={{ marginTop: '24px' }}>
        {p.needsConfirmation && p.confirmUrl && (
          <Button href={p.confirmUrl} style={{ backgroundColor: '#16a34a', color: '#ffffff', fontSize: '15px', fontWeight: 700, padding: '12px 22px', borderRadius: '8px', textDecoration: 'none', marginRight: '8px' }}>
            {t.confirm}
          </Button>
        )}
        {p.needsConfirmation && p.cancelUrl && (
          <Button href={p.cancelUrl} style={{ backgroundColor: '#ffffff', color: '#b91c1c', border: '1px solid #fca5a5', fontSize: '15px', fontWeight: 700, padding: '11px 22px', borderRadius: '8px', textDecoration: 'none', marginRight: '8px' }}>
            {t.cancel}
          </Button>
        )}
        <Button href={p.calendarUrl} style={{ backgroundColor: p.needsConfirmation ? '#ffffff' : colors.brand, color: p.needsConfirmation ? colors.brand : '#ffffff', border: p.needsConfirmation ? `1px solid ${colors.border}` : 'none', fontSize: '15px', fontWeight: 700, padding: '12px 22px', borderRadius: '8px', textDecoration: 'none' }}>
          {t.calendar}
        </Button>
      </Section>
    </EmailLayout>
  )
}
