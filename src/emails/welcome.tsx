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
  { icon: '📞', title: 'Add a phone number', text: 'Buy a number and assign it to your agent so it can receive calls.' },
  { icon: '🤖', title: 'Try out your agent', text: 'Call the number and hear how the agent answers. Fine-tune its behavior in the knowledge base.' },
  { icon: '🔔', title: 'Set up notifications', text: 'Get a summary of every call by email or SMS.' },
]

export function WelcomeEmail({ firstName, businessName, agentName, appUrl }: WelcomeEmailProps) {
  const base = appBaseUrl(appUrl)
  return (
    <EmailLayout preview={`Your agent ${agentName} is ready`}>
      <Heading as="h1" style={{ margin: 0, fontSize: '28px', lineHeight: '34px', color: colors.text }}>
        {firstName ? `Welcome to Receptio, ${firstName}!` : 'Welcome to Receptio!'}
      </Heading>
      <Text style={{ margin: '12px 0 24px', fontSize: '15px', lineHeight: '24px' }}>
        Your agent {agentName} for {businessName} is ready. What next?
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
          Go to the dashboard
        </Button>
      </Section>
    </EmailLayout>
  )
}

export default WelcomeEmail
