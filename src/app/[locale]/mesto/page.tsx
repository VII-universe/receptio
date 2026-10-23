import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { CityDemo } from '@/components/marketing/city/city-demo'

// Pracovní náhled 3D scény (vizuální upgrade, M1). Není v navigaci ani v sitemap a nemá se indexovat.
export const metadata: Metadata = { title: 'Aidino město (náhled)', robots: { index: false, follow: false } }

export default async function CityPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <main id="obsah" className="flex-1">
      <h1 className="sr-only">Aidino město</h1>
      <CityDemo />
    </main>
  )
}
