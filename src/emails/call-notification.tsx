import { Button, Column, Heading, Link, Row, Section, Text } from '@react-email/components'
import { formatClock } from '@/lib/calls'
import { appBaseUrl, formatEmailDateTime, formatPhone } from '@/lib/email/format'
import { colors, EmailLayout, fontFamily } from './components/layout'

export interface CallNotificationEmailProps {
  agentName: string
  callerNumber: string
  duration: number // sekundy
  startedAt: string // ISO
  summary?: string
  transcript?: string
  callId: string
  businessName: string
  appUrl?: string
}

const TRANSCRIPT_MAX = 500

const card = { backgroundColor: colors.card, borderRadius: '8px', padding: '16px' }
const label = { margin: 0, color: colors.muted, fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const value = { margin: '4px 0 0', color: colors.text, fontSize: '18px', fontWeight: 700 }

export function CallNotificationEmail({
  agentName,
  callerNumber,
  duration,
  startedAt,
  summary,
  transcript,
  callId,
  businessName,
  appUrl,
}: CallNotificationEmailProps) {
  const base = appBaseUrl(appUrl)
  const callUrl = `${base}/dashboard/hovory/${encodeURIComponent(callId)}`
  const settingsUrl = `${base}/dashboard/nastaveni?tab=notifikace`

  const text = transcript?.trim()
  const truncated = !!text && text.length > TRANSCRIPT_MAX
  const summaryText = summary?.trim()

  return (
    <EmailLayout
      preview={`New call from ${callerNumber} – ${agentName}`}
      footerLink={{ href: settingsUrl, label: 'Unsubscribe from notifications' }}
    >
      <Heading as="h1" style={{ margin: 0, fontSize: '28px', lineHeight: '34px', color: colors.text }}>
        New call
      </Heading>
      <Text style={{ margin: '8px 0 24px', color: colors.muted, fontSize: '14px' }}>
        {agentName} · {businessName} · {formatEmailDateTime(startedAt)}
      </Text>

      <Row>
        <Column style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
          <Section style={card}>
            <Text style={label}>Caller</Text>
            <Text style={value}>{callerNumber.startsWith('+') ? formatPhone(callerNumber) : callerNumber}</Text>
          </Section>
        </Column>
        <Column style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
          <Section style={card}>
            <Text style={label}>Call duration</Text>
            <Text style={value}>{formatClock(duration)}</Text>
          </Section>
        </Column>
      </Row>

      {summaryText && (
        <Section style={{ ...card, marginTop: '16px' }}>
          <Text style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Summary</Text>
          <Text style={{ margin: '8px 0 0', fontSize: '14px', lineHeight: '22px', whiteSpace: 'pre-wrap' }}>
            {summaryText}
          </Text>
        </Section>
      )}

      {text && (
        <Section style={{ marginTop: '16px' }}>
          <Text style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700 }}>Transcript</Text>
          <Section style={{ ...card, border: `1px solid ${colors.border}` }}>
            <Text
              style={{
                margin: 0,
                fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                fontSize: '12px',
                lineHeight: '18px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {truncated ? `${text.slice(0, TRANSCRIPT_MAX)}…` : text}
            </Text>
            {truncated && (
              <Text style={{ margin: '8px 0 0', fontSize: '12px' }}>
                <Link href={callUrl} style={{ color: colors.brand }}>
                  (view full transcript)
                </Link>
              </Text>
            )}
          </Section>
        </Section>
      )}

      <Section style={{ marginTop: '28px', textAlign: 'center' }}>
        <Button
          href={callUrl}
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
          View call details
        </Button>
      </Section>
    </EmailLayout>
  )
}

export default CallNotificationEmail
