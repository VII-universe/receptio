import { Button, Heading, Section, Text } from '@react-email/components'
import { appBaseUrl } from '@/lib/email/format'
import { colors, EmailLayout, fontFamily } from './components/layout'

export interface WelcomeEmailProps {
  firstName: string
  businessName: string
  agentName: string
  appUrl?: string
}

const STEPS = [
  { icon: '📞', title: 'Přidejte telefonní číslo', text: 'Zakupte české číslo a přiřaďte ho agentovi, aby mohl přijímat hovory.' },
  { icon: '🤖', title: 'Vyzkoušejte agenta', text: 'Zavolejte na číslo a ověřte, jak agent odpovídá. Chování doladíte ve znalostní bázi.' },
  { icon: '🔔', title: 'Nastavte notifikace', text: 'Shrnutí každého hovoru vám přijde na email nebo SMS.' },
]

export function WelcomeEmail({ firstName, businessName, agentName, appUrl }: WelcomeEmailProps) {
  const base = appBaseUrl(appUrl)
  return (
    <EmailLayout preview={`Váš agent ${agentName} je připraven`}>
      <Heading as="h1" style={{ margin: 0, fontSize: '28px', lineHeight: '34px', color: colors.text }}>
        {firstName ? `Vítejte v Receptio, ${firstName}!` : 'Vítejte v Receptio!'}
      </Heading>
      <Text style={{ margin: '12px 0 24px', fontSize: '15px', lineHeight: '24px' }}>
        Váš agent {agentName} pro {businessName} je připraven. Co dál?
      </Text>

      {STEPS.map((s, i) => (
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
          style={{
            backgroundColor: colors.brand,
            color: '#ffffff',
            fontFamily,
            fontSize: '14px',
            fontWeight: 700,
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Přejít do dashboardu
        </Button>
      </Section>
    </EmailLayout>
  )
}

export default WelcomeEmail
