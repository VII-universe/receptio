'use client'

import { openCookieSettings } from '@/lib/consent'

/** Odkaz do patičky, který znovu otevře nastavení cookies (souhlas jde kdykoli změnit nebo odvolat). */
export function CookieSettingsButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      {children}
    </button>
  )
}
