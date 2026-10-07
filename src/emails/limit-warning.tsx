import { Button, Heading, Section, Text } from '@react-email/components'
import { appBaseUrl } from '@/lib/email/format'
import { colors, EmailLayout, fontFamily } from './components/layout'
import { intlLocale, pickLocale } from './i18n'

export interface LimitWarningEmailProps {
  workspaceId: string
  planName: string
  used: number
  max: number
  locale: string
  appUrl?: string
}

interface Texts {
  subject: string
  title: string
  body: (plan: string, used: number, max: number) => string
  paused: string
  button: string
  footer: string
}

const T: Record<string, Texts> & { en: Texts } = {
  cs: {
    subject: 'Limit minut vyčerpán – hovory jsou pozastaveny',
    title: 'Limit minut vyčerpán',
    body: (p, u, m) => `Na plánu ${p} jste vyčerpali ${u} z ${m} minut tento měsíc.`,
    paused: 'Příchozí hovory jsou pozastaveny. Přejděte na vyšší plán, nebo počkejte na začátek dalšího období.',
    button: 'Přejít na vyšší plán',
    footer: 'Receptio · AI hlasový recepční pro malé firmy',
  },
  en: {
    subject: 'Minute limit reached – calls are paused',
    title: 'Minute limit reached',
    body: (p, u, m) => `On the ${p} plan you have used ${u} of ${m} minutes this month.`,
    paused: 'Incoming calls are paused. Upgrade your plan or wait for the next period to start.',
    button: 'Upgrade your plan',
    footer: 'Receptio · AI receptionist for small businesses',
  },
  de: {
    subject: 'Minutenlimit erreicht – Anrufe sind pausiert',
    title: 'Minutenlimit erreicht',
    body: (p, u, m) => `Im Tarif ${p} haben Sie in diesem Monat ${u} von ${m} Minuten verbraucht.`,
    paused: 'Eingehende Anrufe sind pausiert. Wechseln Sie in einen höheren Tarif oder warten Sie auf den nächsten Abrechnungszeitraum.',
    button: 'Tarif upgraden',
    footer: 'Receptio · KI-Telefonassistent für kleine Unternehmen',
  },
  pl: {
    subject: 'Limit minut wyczerpany – połączenia wstrzymane',
    title: 'Limit minut wyczerpany',
    body: (p, u, m) => `W planie ${p} wykorzystano w tym miesiącu ${u} z ${m} minut.`,
    paused: 'Połączenia przychodzące są wstrzymane. Przejdź na wyższy plan lub poczekaj na początek kolejnego okresu.',
    button: 'Zmień plan na wyższy',
    footer: 'Receptio · głosowy recepcjonista AI dla małych firm',
  },
  sk: {
    subject: 'Limit minút vyčerpaný – hovory sú pozastavené',
    title: 'Limit minút vyčerpaný',
    body: (p, u, m) => `V pláne ${p} ste tento mesiac vyčerpali ${u} z ${m} minút.`,
    paused: 'Prichádzajúce hovory sú pozastavené. Prejdite na vyšší plán alebo počkajte na začiatok ďalšieho obdobia.',
    button: 'Prejsť na vyšší plán',
    footer: 'Receptio · AI hlasový recepčný pre malé firmy',
  },
  fr: {
    subject: 'Limite de minutes atteinte – les appels sont suspendus',
    title: 'Limite de minutes atteinte',
    body: (p, u, m) => `Avec l'offre ${p}, vous avez utilisé ${u} minutes sur ${m} ce mois-ci.`,
    paused: "Les appels entrants sont suspendus. Passez à une offre supérieure ou attendez le début de la prochaine période.",
    button: 'Passer à une offre supérieure',
    footer: 'Receptio · réceptionniste vocal IA pour les petites entreprises',
  },
}

export const limitWarningSubject = (locale: string) => pickLocale(T, locale).subject

export function LimitWarningEmail({ planName, used, max, locale, appUrl }: LimitWarningEmailProps) {
  const t = pickLocale(T, locale)
  return (
    <EmailLayout lang={intlLocale(T, locale)} preview={t.subject} footer={t.footer}>
      <Heading as="h1" style={{ margin: 0, fontSize: '28px', lineHeight: '34px', color: colors.text }}>
        {t.title}
      </Heading>
      <Text style={{ margin: '12px 0 8px', fontSize: '15px', lineHeight: '24px' }}>{t.body(planName, used, max)}</Text>
      <Text style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: '24px', fontWeight: 700 }}>{t.paused}</Text>
      <Section style={{ textAlign: 'center' }}>
        <Button
          href={`${appBaseUrl(appUrl)}/dashboard/billing`}
          style={{ backgroundColor: colors.brand, color: '#ffffff', fontFamily, fontSize: '14px', fontWeight: 700, padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }}
        >
          {t.button}
        </Button>
      </Section>
    </EmailLayout>
  )
}

export default LimitWarningEmail
