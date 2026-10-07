import { Button, Heading, Section, Text } from '@react-email/components'
import { appBaseUrl } from '@/lib/email/format'
import { formatPrice, PLANS, type Currency } from '@/lib/stripe/plans'
import { colors, EmailLayout, fontFamily } from './components/layout'

export interface SubscriptionConfirmationEmailProps {
  firstName: string
  planName: string // Starter / Business / Pro
  price: number // částka v dané měně
  currency: Currency
  nextBillingDate: string // "6. 11. 2026"
  appUrl?: string
}

export function SubscriptionConfirmationEmail({
  firstName,
  planName,
  price,
  currency,
  nextBillingDate,
  appUrl,
}: SubscriptionConfirmationEmailProps) {
  const base = appBaseUrl(appUrl)
  const plan = Object.values(PLANS).find((p) => p.nameCs === planName || p.name === planName)

  return (
    <EmailLayout preview={`Předplatné ${planName} je aktivní`}>
      <Heading as="h1" style={{ margin: 0, fontSize: '28px', lineHeight: '34px', color: colors.text }}>
        Předplatné aktivováno!
      </Heading>
      <Text style={{ margin: '12px 0 24px', fontSize: '15px', lineHeight: '24px' }}>
        {firstName ? `Děkujeme, ${firstName}. ` : 'Děkujeme. '}
        Plán <strong>{planName}</strong> ({formatPrice(price, currency)} měsíčně) je aktivní.
      </Text>

      {plan && (
        <Section style={{ backgroundColor: colors.card, borderRadius: '8px', padding: '16px' }}>
          <Text style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Co je zahrnuto</Text>
          {plan.features.map((f) => (
            <Text key={f} style={{ margin: '6px 0 0', fontSize: '14px' }}>
              ✓ {f}
            </Text>
          ))}
        </Section>
      )}

      <Text style={{ margin: '20px 0 0', fontSize: '14px', color: colors.muted }}>
        Další platba proběhne <strong style={{ color: colors.text }}>{nextBillingDate}</strong>.
      </Text>

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

export default SubscriptionConfirmationEmail
