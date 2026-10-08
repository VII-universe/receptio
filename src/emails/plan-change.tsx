import { Button, Heading, Section, Text } from '@react-email/components'
import { appBaseUrl } from '@/lib/email/format'
import { colors, EmailLayout, fontFamily } from './components/layout'
import { intlLocale, pickLocale } from './i18n'

export type PlanChangeVariant = 'downgraded' | 'canceled'

export interface PlanChangeEmailProps {
  workspaceId: string
  variant: PlanChangeVariant
  locale: string
  appUrl?: string
}

interface Texts {
  downgradedSubject: string
  downgradedTitle: string
  downgradedBody: string
  downgradedButton: string
  canceledSubject: string
  canceledTitle: string
  canceledBody: string
  canceledButton: string
  footer: string
}

const T: Record<string, Texts> & { en: Texts } = {
  cs: {
    downgradedSubject: 'Váš plán Receptio byl změněn',
    downgradedTitle: 'Váš plán byl změněn',
    downgradedBody: 'Váš plán byl změněn, některé funkce jsou pozastaveny, dokud nesnížíte počet agentů nebo čísel (nebo nepřejdete na vyšší plán). Nic jsme nesmazali.',
    downgradedButton: 'Spravovat plán',
    canceledSubject: 'Vaše předplatné Receptio bylo zrušeno',
    canceledTitle: 'Předplatné bylo zrušeno',
    canceledBody: 'Vaše předplatné skončilo a hovory jsou pozastaveny. Svá data i agenty máte dál a plán můžete kdykoli obnovit.',
    canceledButton: 'Vybrat plán',
    footer: 'Receptio · AI hlasový recepční pro malé firmy',
  },
  en: {
    downgradedSubject: 'Your Receptio plan has changed',
    downgradedTitle: 'Your plan has changed',
    downgradedBody: 'Your plan was changed and some features are paused until you reduce the number of agents or phone numbers (or upgrade). Nothing has been deleted.',
    downgradedButton: 'Manage plan',
    canceledSubject: 'Your Receptio subscription has been canceled',
    canceledTitle: 'Your subscription has been canceled',
    canceledBody: 'Your subscription has ended and calls are paused. Your data and agents are kept, and you can restore a plan at any time.',
    canceledButton: 'Choose a plan',
    footer: 'Receptio · AI receptionist for small businesses',
  },
  de: {
    downgradedSubject: 'Ihr Receptio-Tarif wurde geändert',
    downgradedTitle: 'Ihr Tarif wurde geändert',
    downgradedBody: 'Ihr Tarif wurde geändert, einige Funktionen sind pausiert, bis Sie die Anzahl der Agenten oder Nummern verringern (oder upgraden). Es wurde nichts gelöscht.',
    downgradedButton: 'Tarif verwalten',
    canceledSubject: 'Ihr Receptio-Abonnement wurde gekündigt',
    canceledTitle: 'Ihr Abonnement wurde gekündigt',
    canceledBody: 'Ihr Abonnement ist beendet und Anrufe sind pausiert. Ihre Daten und Agenten bleiben erhalten, und Sie können jederzeit wieder einen Tarif wählen.',
    canceledButton: 'Tarif wählen',
    footer: 'Receptio · KI-Telefonassistent für kleine Unternehmen',
  },
  pl: {
    downgradedSubject: 'Twój plan Receptio został zmieniony',
    downgradedTitle: 'Twój plan został zmieniony',
    downgradedBody: 'Twój plan został zmieniony, a niektóre funkcje są wstrzymane, dopóki nie zmniejszysz liczby agentów lub numerów (albo nie przejdziesz na wyższy plan). Nic nie zostało usunięte.',
    downgradedButton: 'Zarządzaj planem',
    canceledSubject: 'Twoja subskrypcja Receptio została anulowana',
    canceledTitle: 'Subskrypcja została anulowana',
    canceledBody: 'Twoja subskrypcja się zakończyła, a połączenia są wstrzymane. Dane i agenci zostają, a plan możesz przywrócić w dowolnym momencie.',
    canceledButton: 'Wybierz plan',
    footer: 'Receptio · głosowy recepcjonista AI dla małych firm',
  },
  sk: {
    downgradedSubject: 'Váš plán Receptio bol zmenený',
    downgradedTitle: 'Váš plán bol zmenený',
    downgradedBody: 'Váš plán bol zmenený a niektoré funkcie sú pozastavené, kým neznížite počet agentov alebo čísel (alebo neprejdete na vyšší plán). Nič sme nezmazali.',
    downgradedButton: 'Spravovať plán',
    canceledSubject: 'Vaše predplatné Receptio bolo zrušené',
    canceledTitle: 'Predplatné bolo zrušené',
    canceledBody: 'Vaše predplatné skončilo a hovory sú pozastavené. Dáta aj agentov máte ďalej a plán môžete kedykoľvek obnoviť.',
    canceledButton: 'Vybrať plán',
    footer: 'Receptio · AI hlasový recepčný pre malé firmy',
  },
  fr: {
    downgradedSubject: 'Votre offre Receptio a changé',
    downgradedTitle: 'Votre offre a changé',
    downgradedBody: "Votre offre a été modifiée et certaines fonctionnalités sont suspendues tant que vous n'avez pas réduit le nombre d'agents ou de numéros (ou changé d'offre). Rien n'a été supprimé.",
    downgradedButton: "Gérer l'offre",
    canceledSubject: 'Votre abonnement Receptio a été résilié',
    canceledTitle: 'Votre abonnement a été résilié',
    canceledBody: 'Votre abonnement est terminé et les appels sont suspendus. Vos données et vos agents sont conservés, et vous pouvez reprendre une offre à tout moment.',
    canceledButton: 'Choisir une offre',
    footer: 'Receptio · réceptionniste vocal IA pour les petites entreprises',
  },
}

export const planChangeSubject = (locale: string, variant: PlanChangeVariant) => {
  const t = pickLocale(T, locale)
  return variant === 'downgraded' ? t.downgradedSubject : t.canceledSubject
}

export function PlanChangeEmail({ variant, locale, appUrl }: PlanChangeEmailProps) {
  const t = pickLocale(T, locale)
  const down = variant === 'downgraded'
  return (
    <EmailLayout lang={intlLocale(T, locale)} preview={planChangeSubject(locale, variant)} footer={t.footer}>
      <Heading as="h1" style={{ margin: 0, fontSize: '28px', lineHeight: '34px', color: colors.text }}>
        {down ? t.downgradedTitle : t.canceledTitle}
      </Heading>
      <Text style={{ margin: '12px 0 24px', fontSize: '15px', lineHeight: '24px' }}>{down ? t.downgradedBody : t.canceledBody}</Text>
      <Section style={{ textAlign: 'center' }}>
        <Button
          href={`${appBaseUrl(appUrl)}/dashboard/billing`}
          style={{ backgroundColor: colors.brand, color: '#ffffff', fontFamily, fontSize: '14px', fontWeight: 700, padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }}
        >
          {down ? t.downgradedButton : t.canceledButton}
        </Button>
      </Section>
    </EmailLayout>
  )
}

export default PlanChangeEmail
