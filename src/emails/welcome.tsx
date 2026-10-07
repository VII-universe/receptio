import { Button, Heading, Section, Text } from '@react-email/components'
import { appBaseUrl } from '@/lib/email/format'
import { colors, EmailLayout, fontFamily } from './components/layout'
import { intlLocale, pickLocale } from './i18n'

export interface WelcomeEmailProps {
  workspaceId: string
  ownerName: string
  agentName: string
  locale: string
  appUrl?: string
}

interface Texts {
  subject: (agent: string) => string
  title: (name: string) => string
  intro: (agent: string) => string
  steps: { icon: string; title: string; text: string }[]
  button: string
  footer: string
}

const T: Record<string, Texts> & { en: Texts } = {
  cs: {
    subject: (a) => `Vítejte v Receptio – ${a} je připraven`,
    title: (n) => (n ? `Vítejte v Receptio, ${n}!` : 'Vítejte v Receptio!'),
    intro: (a) => `Váš agent ${a} je připraven. Co dál?`,
    steps: [
      { icon: '📞', title: 'Přidejte telefonní číslo', text: 'Kupte číslo a přiřaďte ho agentovi, aby mohl přijímat hovory.' },
      { icon: '🤖', title: 'Vyzkoušejte svého agenta', text: 'Zavolejte na číslo a poslechněte si, jak agent odpovídá. Chování doladíte ve znalostní bázi.' },
      { icon: '🔔', title: 'Nastavte oznámení', text: 'Získejte shrnutí každého hovoru e-mailem nebo SMS.' },
    ],
    button: 'Přejít na dashboard',
    footer: 'Receptio · AI hlasový recepční pro malé firmy',
  },
  en: {
    subject: (a) => `Welcome to Receptio – ${a} is ready`,
    title: (n) => (n ? `Welcome to Receptio, ${n}!` : 'Welcome to Receptio!'),
    intro: (a) => `Your agent ${a} is ready. What next?`,
    steps: [
      { icon: '📞', title: 'Add a phone number', text: 'Buy a number and assign it to your agent so it can receive calls.' },
      { icon: '🤖', title: 'Try out your agent', text: 'Call the number and hear how the agent answers. Fine-tune its behavior in the knowledge base.' },
      { icon: '🔔', title: 'Set up notifications', text: 'Get a summary of every call by email or SMS.' },
    ],
    button: 'Go to the dashboard',
    footer: 'Receptio · AI receptionist for small businesses',
  },
  de: {
    subject: (a) => `Willkommen bei Receptio – ${a} ist bereit`,
    title: (n) => (n ? `Willkommen bei Receptio, ${n}!` : 'Willkommen bei Receptio!'),
    intro: (a) => `Ihr Agent ${a} ist bereit. Wie geht es weiter?`,
    steps: [
      { icon: '📞', title: 'Telefonnummer hinzufügen', text: 'Kaufen Sie eine Nummer und weisen Sie sie Ihrem Agenten zu, damit er Anrufe entgegennehmen kann.' },
      { icon: '🤖', title: 'Agenten ausprobieren', text: 'Rufen Sie die Nummer an und hören Sie, wie der Agent antwortet. Das Verhalten feilen Sie in der Wissensdatenbank aus.' },
      { icon: '🔔', title: 'Benachrichtigungen einrichten', text: 'Erhalten Sie eine Zusammenfassung jedes Anrufs per E-Mail oder SMS.' },
    ],
    button: 'Zum Dashboard',
    footer: 'Receptio · KI-Telefonassistent für kleine Unternehmen',
  },
  pl: {
    subject: (a) => `Witaj w Receptio – ${a} jest gotowy`,
    title: (n) => (n ? `Witaj w Receptio, ${n}!` : 'Witaj w Receptio!'),
    intro: (a) => `Twój agent ${a} jest gotowy. Co dalej?`,
    steps: [
      { icon: '📞', title: 'Dodaj numer telefonu', text: 'Kup numer i przypisz go agentowi, aby mógł odbierać połączenia.' },
      { icon: '🤖', title: 'Wypróbuj swojego agenta', text: 'Zadzwoń pod numer i posłuchaj, jak agent odpowiada. Zachowanie dopracujesz w bazie wiedzy.' },
      { icon: '🔔', title: 'Skonfiguruj powiadomienia', text: 'Otrzymuj podsumowanie każdego połączenia e-mailem lub SMS-em.' },
    ],
    button: 'Przejdź do panelu',
    footer: 'Receptio · głosowy recepcjonista AI dla małych firm',
  },
  sk: {
    subject: (a) => `Vitajte v Receptio – ${a} je pripravený`,
    title: (n) => (n ? `Vitajte v Receptio, ${n}!` : 'Vitajte v Receptio!'),
    intro: (a) => `Váš agent ${a} je pripravený. Čo ďalej?`,
    steps: [
      { icon: '📞', title: 'Pridajte telefónne číslo', text: 'Kúpte číslo a priraďte ho agentovi, aby mohol prijímať hovory.' },
      { icon: '🤖', title: 'Vyskúšajte svojho agenta', text: 'Zavolajte na číslo a vypočujte si, ako agent odpovedá. Správanie doladíte v znalostnej báze.' },
      { icon: '🔔', title: 'Nastavte oznámenia', text: 'Získajte zhrnutie každého hovoru e-mailom alebo SMS.' },
    ],
    button: 'Prejsť na dashboard',
    footer: 'Receptio · AI hlasový recepčný pre malé firmy',
  },
  fr: {
    subject: (a) => `Bienvenue sur Receptio – ${a} est prêt`,
    title: (n) => (n ? `Bienvenue sur Receptio, ${n} !` : 'Bienvenue sur Receptio !'),
    intro: (a) => `Votre agent ${a} est prêt. Et maintenant ?`,
    steps: [
      { icon: '📞', title: 'Ajoutez un numéro de téléphone', text: 'Achetez un numéro et attribuez-le à votre agent pour qu’il puisse recevoir des appels.' },
      { icon: '🤖', title: 'Essayez votre agent', text: 'Appelez le numéro et écoutez comment l’agent répond. Affinez son comportement dans la base de connaissances.' },
      { icon: '🔔', title: 'Configurez les notifications', text: 'Recevez un résumé de chaque appel par e-mail ou SMS.' },
    ],
    button: 'Aller au tableau de bord',
    footer: 'Receptio · réceptionniste vocal IA pour les petites entreprises',
  },
}

export const welcomeSubject = (locale: string, agentName: string) => pickLocale(T, locale).subject(agentName)

export function WelcomeEmail({ ownerName, agentName, locale, appUrl }: WelcomeEmailProps) {
  const t = pickLocale(T, locale)
  const base = appBaseUrl(appUrl)
  return (
    <EmailLayout lang={intlLocale(T, locale)} preview={t.subject(agentName)} footer={t.footer}>
      <Heading as="h1" style={{ margin: 0, fontSize: '28px', lineHeight: '34px', color: colors.text }}>
        {t.title(ownerName)}
      </Heading>
      <Text style={{ margin: '12px 0 24px', fontSize: '15px', lineHeight: '24px' }}>{t.intro(agentName)}</Text>

      {t.steps.map((s, i) => (
        <Section key={s.title} style={{ backgroundColor: colors.card, borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
          <Text style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
            {s.icon} {i + 1}. {s.title}
          </Text>
          <Text style={{ margin: '6px 0 0', fontSize: '14px', lineHeight: '21px', color: colors.muted }}>{s.text}</Text>
        </Section>
      ))}

      <Section style={{ marginTop: '24px', textAlign: 'center' }}>
        <Button
          href={`${base}/dashboard`}
          style={{ backgroundColor: colors.brand, color: '#ffffff', fontFamily, fontSize: '14px', fontWeight: 700, padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }}
        >
          {t.button}
        </Button>
      </Section>
    </EmailLayout>
  )
}

export default WelcomeEmail
