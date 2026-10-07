import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { colors, EmailLayout, fontFamily } from './components/layout'
import { intlLocale, pickLocale } from './i18n'

export interface InviteEmailProps {
  workspaceId: string
  inviterName: string
  workspaceName: string
  inviteUrl: string // Clerk invitation URL
  locale: string
}

interface Texts {
  subject: (inviter: string, workspace: string) => string
  title: string
  body: (inviter: string, workspace: string) => string
  button: string
  copy: string
  ignore: string
  footer: string
}

const T: Record<string, Texts> & { en: Texts } = {
  cs: {
    subject: (i, w) => `${i} vás zve do ${w} na Receptio`,
    title: 'Máte pozvánku',
    body: (i, w) => `${i} vás zve do workspace ${w} v Receptio, AI hlasovém recepčním.`,
    button: 'Přijmout pozvánku',
    copy: 'Nebo zkopírujte tento odkaz do prohlížeče:',
    ignore: 'Pokud jste tuto pozvánku nečekali, můžete tento e-mail ignorovat.',
    footer: 'Receptio · AI hlasový recepční pro malé firmy',
  },
  en: {
    subject: (i, w) => `${i} invited you to ${w} on Receptio`,
    title: 'You have been invited',
    body: (i, w) => `${i} invited you to join the workspace ${w} on Receptio, the AI voice receptionist.`,
    button: 'Accept invitation',
    copy: 'Or copy this link into your browser:',
    ignore: 'If you were not expecting this invitation, you can safely ignore this email.',
    footer: 'Receptio · AI receptionist for small businesses',
  },
  de: {
    subject: (i, w) => `${i} hat Sie zu ${w} bei Receptio eingeladen`,
    title: 'Sie wurden eingeladen',
    body: (i, w) => `${i} hat Sie eingeladen, dem Workspace ${w} bei Receptio, dem KI-Telefonassistenten, beizutreten.`,
    button: 'Einladung annehmen',
    copy: 'Oder kopieren Sie diesen Link in Ihren Browser:',
    ignore: 'Wenn Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.',
    footer: 'Receptio · KI-Telefonassistent für kleine Unternehmen',
  },
  pl: {
    subject: (i, w) => `${i} zaprasza Cię do ${w} w Receptio`,
    title: 'Masz zaproszenie',
    body: (i, w) => `${i} zaprasza Cię do dołączenia do workspace'u ${w} w Receptio, głosowym recepcjoniście AI.`,
    button: 'Przyjmij zaproszenie',
    copy: 'Lub skopiuj ten link do przeglądarki:',
    ignore: 'Jeśli to zaproszenie jest dla Ciebie niespodzianką, możesz zignorować tę wiadomość.',
    footer: 'Receptio · głosowy recepcjonista AI dla małych firm',
  },
  sk: {
    subject: (i, w) => `${i} vás pozýva do ${w} v Receptio`,
    title: 'Máte pozvánku',
    body: (i, w) => `${i} vás pozýva pripojiť sa k workspace ${w} v Receptio, AI hlasovom recepčnom.`,
    button: 'Prijať pozvánku',
    copy: 'Alebo skopírujte tento odkaz do prehliadača:',
    ignore: 'Ak ste túto pozvánku nečakali, môžete tento e-mail ignorovať.',
    footer: 'Receptio · AI hlasový recepčný pre malé firmy',
  },
  fr: {
    subject: (i, w) => `${i} vous invite à rejoindre ${w} sur Receptio`,
    title: 'Vous êtes invité(e)',
    body: (i, w) => `${i} vous invite à rejoindre l'espace de travail ${w} sur Receptio, le réceptionniste vocal IA.`,
    button: "Accepter l'invitation",
    copy: 'Ou copiez ce lien dans votre navigateur :',
    ignore: "Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.",
    footer: 'Receptio · réceptionniste vocal IA pour les petites entreprises',
  },
}

export const inviteSubject = (locale: string, inviterName: string, workspaceName: string) =>
  pickLocale(T, locale).subject(inviterName, workspaceName)

export function InviteEmail({ inviterName, workspaceName, inviteUrl, locale }: InviteEmailProps) {
  const t = pickLocale(T, locale)
  return (
    <EmailLayout lang={intlLocale(T, locale)} preview={t.subject(inviterName, workspaceName)} footer={t.footer}>
      <Heading as="h1" style={{ margin: 0, fontSize: '28px', lineHeight: '34px', color: colors.text }}>
        {t.title}
      </Heading>
      <Text style={{ margin: '12px 0 24px', fontSize: '15px', lineHeight: '24px' }}>{t.body(inviterName, workspaceName)}</Text>
      <Section style={{ textAlign: 'center' }}>
        <Button
          href={inviteUrl}
          style={{ backgroundColor: colors.brand, color: '#ffffff', fontFamily, fontSize: '14px', fontWeight: 700, padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }}
        >
          {t.button}
        </Button>
      </Section>
      <Text style={{ margin: '24px 0 4px', fontSize: '12px', color: colors.muted }}>{t.copy}</Text>
      <Text style={{ margin: 0, fontSize: '12px', wordBreak: 'break-all' }}>
        <Link href={inviteUrl} style={{ color: colors.brand }}>
          {inviteUrl}
        </Link>
      </Text>
      <Text style={{ margin: '24px 0 0', fontSize: '12px', color: colors.muted }}>{t.ignore}</Text>
    </EmailLayout>
  )
}

export default InviteEmail
