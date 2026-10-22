import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { themeInitScript } from '@/components/theme/theme-script'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Receptio – AI hlasový recepční', template: '%s | Receptio' },
  description:
    'Receptio je AI hlasový recepční pro malé firmy. Zvedne telefon, domluví termín a nic vám neunikne.',
}

// ClerkProvider (a s ním Clerk JS v prohlížeči) je jen v layoutech aplikace: (auth), (dashboard),
// onboarding a admin. Veřejný web se bez něj obejde. Serverové auth() a middleware provider nepotřebují.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Proměnné fontů musí být na <html>: font-family na html odkazuje na var(--font-geist-sans).
    <html lang="cs" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Nastaví téma před prvním vykreslením, ať neproblikne světlé. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
