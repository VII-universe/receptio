import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { themeInitScript } from '@/components/theme/theme-script'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
// Displejové písmo pro akcenty v nadpisech marketingu (latin-ext kvůli diakritice; řečtina/cyrilice padá na Georgii).
const instrument = Instrument_Serif({ variable: '--font-instrument', subsets: ['latin', 'latin-ext'], weight: '400', style: ['normal', 'italic'] })

export const metadata: Metadata = {
  title: { default: 'Receptio – AI hlasový recepční', template: '%s | Receptio' },
  description:
    'Receptio je AI hlasový recepční pro malé firmy. Zvedne telefon, domluví termín a nic vám neunikne.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      {/* Proměnné fontů musí být na <html>: font-family na html odkazuje na var(--font-geist-sans). */}
      <html lang="cs" className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable}`} suppressHydrationWarning>
        <head>
          {/* Nastaví téma před prvním vykreslením, ať neproblikne světlé. */}
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body className="antialiased">
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
