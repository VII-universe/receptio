import { Body, Container, Head, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'

export const colors = {
  brand: '#1e3a5f',
  text: '#1a1a1a',
  muted: '#6b7280',
  card: '#f3f4f6',
  border: '#e5e7eb',
}

export const fontFamily = 'Arial, Helvetica, sans-serif'

/** Společný rámec e-mailů: tmavě modrá hlavička, bílý obsah (max. 600 px), patička. */
export function EmailLayout({
  preview,
  children,
  footerLink,
}: {
  preview: string
  children: ReactNode
  footerLink?: { href: string; label: string }
}) {
  return (
    <Html lang="cs">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#ffffff', fontFamily, color: colors.text }}>
        <Container style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
          <Section style={{ backgroundColor: colors.brand, padding: '24px 32px' }}>
            <Text style={{ margin: 0, color: '#ffffff', fontSize: '24px', fontWeight: 700, lineHeight: '28px' }}>
              Receptio
            </Text>
            <Text style={{ margin: '4px 0 0', color: '#cbd5e1', fontSize: '12px', letterSpacing: '1px' }}>
              AI Recepční
            </Text>
          </Section>

          <Section style={{ padding: '32px' }}>{children}</Section>

          <Hr style={{ borderColor: colors.border, margin: 0 }} />
          <Section style={{ padding: '20px 32px' }}>
            <Text style={{ margin: 0, color: colors.muted, fontSize: '12px', textAlign: 'center' }}>
              Receptio · AI Recepční pro české firmy
            </Text>
            {footerLink && (
              <Text style={{ margin: '8px 0 0', fontSize: '12px', textAlign: 'center' }}>
                <Link href={footerLink.href} style={{ color: colors.muted, textDecoration: 'underline' }}>
                  {footerLink.label}
                </Link>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
