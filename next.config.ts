import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Dřívější české adresy dashboardu (odkazy v e-mailech, záložky) vedou na anglické.
  async redirects() {
    return [
      { source: '/dashboard/analytika', destination: '/dashboard/analytics', permanent: true },
      { source: '/dashboard/hovory', destination: '/dashboard/calls', permanent: true },
      { source: '/dashboard/hovory/:path*', destination: '/dashboard/calls/:path*', permanent: true },
      { source: '/dashboard/nastaveni', destination: '/dashboard/settings', permanent: true },
      { source: '/dashboard/tym', destination: '/dashboard/team', permanent: true },
      { source: '/dashboard/telefon', destination: '/dashboard/phone-numbers', permanent: true },
      { source: '/dashboard/phone', destination: '/dashboard/phone-numbers', permanent: true },
      { source: '/dashboard/fakturace', destination: '/dashboard/billing', permanent: true },
      { source: '/dashboard/agent', destination: '/dashboard/agents', permanent: true },
      { source: '/dashboard/setup', destination: '/onboarding', permanent: true },
    ]
  },
}

export default withNextIntl(nextConfig)
