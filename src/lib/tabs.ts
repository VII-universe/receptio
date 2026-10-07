// Typy a kontroly záložek žijí mimo "use client" soubory: serverové stránky je volají
// a funkci exportovanou z klientského modulu nelze ze serveru zavolat.

export type AgentTab = 'nastaveni' | 'pracovni-doba' | 'znalostni-baze'

export const isAgentTab = (v: unknown): v is AgentTab =>
  v === 'nastaveni' || v === 'pracovni-doba' || v === 'znalostni-baze'

export type SettingsTab = 'obecne' | 'notifikace' | 'profil' | 'api'

export const isSettingsTab = (v: unknown): v is SettingsTab =>
  v === 'obecne' || v === 'notifikace' || v === 'profil' || v === 'api'
