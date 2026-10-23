import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/marketing/site'

// Indexuje se jen veřejný web; aplikace, přihlášení a API ne.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/onboarding', '/sign-in', '/sign-up', '/api/', '/booking-action', '/email-preview'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
