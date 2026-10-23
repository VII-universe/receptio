import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { LEGAL } from '@/lib/legal'
import { CONTACT_EMAIL } from '@/lib/marketing/flags'
import { CURRENCIES, MARKETING_PLANS } from '@/lib/marketing/plans'
import { localizedPath, SITE_URL } from '@/lib/marketing/site'

/**
 * JSON-LD pro vyhledávače: Organization a SoftwareApplication s nabídkami z konfigurace plánů
 * (měsíční cena v CZK i EUR). Žádná hodnocení ani recenze, dokud nejsou skutečné.
 */
export async function StructuredData({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing.meta' })
  const orgId = `${SITE_URL}/#organization`
  const pricingUrl = SITE_URL + localizedPath('/cennik', locale)
  const legalName = LEGAL.name !== '[●]' ? LEGAL.name : undefined

  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': orgId, name: 'Receptio', url: SITE_URL, email: CONTACT_EMAIL, ...(legalName && { legalName }) },
      {
        '@type': 'SoftwareApplication',
        name: 'Receptio',
        url: SITE_URL + localizedPath('/', locale),
        description: t('description'),
        inLanguage: locale,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        publisher: { '@id': orgId },
        offers: MARKETING_PLANS.flatMap((plan) =>
          CURRENCIES.map((currency) => ({
            '@type': 'Offer',
            name: plan.name,
            url: pricingUrl,
            price: plan.price[currency],
            priceCurrency: currency,
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: plan.price[currency],
              priceCurrency: currency,
              referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
            },
          }))
        ),
      },
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
