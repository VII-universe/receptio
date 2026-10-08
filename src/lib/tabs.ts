// Typy a kontroly záložek žijí mimo "use client" soubory: serverové stránky je volají
// a funkci exportovanou z klientského modulu nelze ze serveru zavolat.

export type AgentTab = 'nastaveni' | 'pracovni-doba' | 'znalostni-baze' | 'presmerovani'

export const isAgentTab = (v: unknown): v is AgentTab =>
  v === 'nastaveni' || v === 'pracovni-doba' || v === 'znalostni-baze' || v === 'presmerovani'

export type SettingsTab = 'obecne' | 'notifikace' | 'profil' | 'api' | 'webhooky'

export const isSettingsTab = (v: unknown): v is SettingsTab =>
  v === 'obecne' || v === 'notifikace' || v === 'profil' || v === 'api' || v === 'webhooky'
