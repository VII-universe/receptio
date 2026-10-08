import { Button, Heading, Section, Text } from '@react-email/components'
import { appBaseUrl } from '@/lib/email/format'
import { colors, EmailLayout, fontFamily } from './components/layout'
import { intlLocale, pickLocale } from './i18n'

export type TrialEmailVariant = 'ending' | 'ended'

export interface TrialEmailProps {
  workspaceId: string
  variant: TrialEmailVariant
  daysLeft: number // jen pro variantu 'ending'
  locale: string
  appUrl?: string
}

interface Texts {
  inDays: (n: number) => string // "za 2 dny" / "in 2 days"
  endingSubject: (when: string) => string
  endingTitle: string
  endingBody: string
  endingButton: string
  endedSubject: string
  endedTitle: string
  endedBody: string
  endedButton: string
  footer: string
}

const T: Record<string, Texts> & { en: Texts } = {
  cs: {
    inDays: (n) => `za ${n} ${n === 1 ? 'den' : n <= 4 ? 'dny' : 'dní'}`,
    endingSubject: (w) => `Vaše zkušební verze Receptio končí ${w}`,
    endingTitle: 'Zkušební verze brzy skončí',
    endingBody: 'Po skončení zkušební verze se hovory zastaví. Přidejte platební kartu a pokračujte bez přerušení.',
    endingButton: 'Přidat platební kartu',
    endedSubject: 'Vaše zkušební verze Receptio skončila',
    endedTitle: 'Zkušební verze skončila',
    endedBody: 'Hovory jsou pozastaveny. Přejděte na placený plán a služba se obnoví.',
    endedButton: 'Přejít na placený plán',
    footer: 'Receptio · AI hlasový recepční pro malé firmy',
  },
  en: {
    inDays: (n) => `in ${n} ${n === 1 ? 'day' : 'days'}`,
    endingSubject: (w) => `Your Receptio trial ends ${w}`,
    endingTitle: 'Your trial is ending soon',
    endingBody: 'When the trial ends, calls will stop. Add a payment card to continue without interruption.',
    endingButton: 'Add a payment card',
    endedSubject: 'Your Receptio trial has ended',
    endedTitle: 'Your trial has ended',
    endedBody: 'Calls are paused. Upgrade to a paid plan to restore the service.',
    endedButton: 'Upgrade to a paid plan',
    footer: 'Receptio · AI receptionist for small businesses',
  },
  de: {
    inDays: (n) => `in ${n} ${n === 1 ? 'Tag' : 'Tagen'}`,
    endingSubject: (w) => `Ihre Receptio-Testphase endet ${w}`,
    endingTitle: 'Ihre Testphase endet bald',
    endingBody: 'Nach Ablauf der Testphase werden Anrufe angehalten. Hinterlegen Sie eine Zahlungskarte, um ohne Unterbrechung weiterzumachen.',
    endingButton: 'Zahlungskarte hinzufügen',
    endedSubject: 'Ihre Receptio-Testphase ist abgelaufen',
    endedTitle: 'Ihre Testphase ist abgelaufen',
    endedBody: 'Anrufe sind pausiert. Wechseln Sie in einen kostenpflichtigen Tarif, um den Dienst wiederherzustellen.',
    endedButton: 'Zu einem kostenpflichtigen Tarif wechseln',
    footer: 'Receptio · KI-Telefonassistent für kleine Unternehmen',
  },
  pl: {
    inDays: (n) => `za ${n} ${n === 1 ? 'dzień' : 'dni'}`,
    endingSubject: (w) => `Twoja wersja próbna Receptio kończy się ${w}`,
    endingTitle: 'Wersja próbna wkrótce się kończy',
    endingBody: 'Po zakończeniu wersji próbnej połączenia zostaną wstrzymane. Dodaj kartę płatniczą, aby kontynuować bez przerwy.',
    endingButton: 'Dodaj kartę płatniczą',
    endedSubject: 'Twoja wersja próbna Receptio się zakończyła',
    endedTitle: 'Wersja próbna się zakończyła',
    endedBody: 'Połączenia są wstrzymane. Przejdź na płatny plan, aby przywrócić usługę.',
    endedButton: 'Przejdź na płatny plan',
    footer: 'Receptio · głosowy recepcjonista AI dla małych firm',
  },
  sk: {
    inDays: (n) => `o ${n} ${n === 1 ? 'deň' : n <= 4 ? 'dni' : 'dní'}`,
    endingSubject: (w) => `Vaša skúšobná verzia Receptio sa končí ${w}`,
    endingTitle: 'Skúšobná verzia sa čoskoro skončí',
    endingBody: 'Po skončení skúšobnej verzie sa hovory zastavia. Pridajte platobnú kartu a pokračujte bez prerušenia.',
    endingButton: 'Pridať platobnú kartu',
    endedSubject: 'Vaša skúšobná verzia Receptio sa skončila',
    endedTitle: 'Skúšobná verzia sa skončila',
    endedBody: 'Hovory sú pozastavené. Prejdite na platený plán a služba sa obnoví.',
    endedButton: 'Prejsť na platený plán',
    footer: 'Receptio · AI hlasový recepčný pre malé firmy',
  },
  fr: {
    inDays: (n) => `dans ${n} ${n === 1 ? 'jour' : 'jours'}`,
    endingSubject: (w) => `Votre essai Receptio se termine ${w}`,
    endingTitle: 'Votre essai se termine bientôt',
    endingBody: "À la fin de l'essai, les appels seront suspendus. Ajoutez une carte de paiement pour continuer sans interruption.",
    endingButton: 'Ajouter une carte de paiement',
    endedSubject: 'Votre essai Receptio est terminé',
    endedTitle: 'Votre essai est terminé',
    endedBody: 'Les appels sont suspendus. Passez à une offre payante pour rétablir le service.',
    endedButton: 'Passer à une offre payante',
    footer: 'Receptio · réceptionniste vocal IA pour les petites entreprises',
  },
}

export function trialEmailSubject(locale: string, variant: TrialEmailVariant, daysLeft: number) {
  const t = pickLocale(T, locale)
  return variant === 'ending' ? t.endingSubject(t.inDays(Math.max(1, daysLeft))) : t.endedSubject
}

export function TrialEmail({ variant, daysLeft, locale, appUrl }: TrialEmailProps) {
  const t = pickLocale(T, locale)
  const ending = variant === 'ending'
  return (
    <EmailLayout lang={intlLocale(T, locale)} preview={trialEmailSubject(locale, variant, daysLeft)} footer={t.footer}>
      <Heading as="h1" style={{ margin: 0, fontSize: '28px', lineHeight: '34px', color: colors.text }}>
        {ending ? t.endingTitle : t.endedTitle}
      </Heading>
      <Text style={{ margin: '12px 0 24px', fontSize: '15px', lineHeight: '24px' }}>{ending ? t.endingBody : t.endedBody}</Text>
      <Section style={{ textAlign: 'center' }}>
        <Button
          href={`${appBaseUrl(appUrl)}/dashboard/billing`}
          style={{ backgroundColor: colors.brand, color: '#ffffff', fontFamily, fontSize: '14px', fontWeight: 700, padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }}
        >
          {ending ? t.endingButton : t.endedButton}
        </Button>
      </Section>
    </EmailLayout>
  )
}

export default TrialEmail
