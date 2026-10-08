/** Klíč v localStorage a hodnoty (sdílené mezi skriptem před vykreslením a ThemeProvider). */
export const THEME_STORAGE_KEY = 'receptio-theme'
export const ACCENTS = ['neutral', 'indigo', 'emerald', 'rose', 'amber', 'violet'] as const
export type Accent = (typeof ACCENTS)[number]
export type Mode = 'light' | 'dark' | 'system'

/**
 * Skript, který se spustí dřív, než se stránka vykreslí (jinak by při načtení probliklo světlé téma):
 * přečte uložené téma a nastaví třídu `dark` a atribut `data-accent` na <html>.
 */
export const themeInitScript = `(function(){try{var s=JSON.parse(localStorage.getItem('${THEME_STORAGE_KEY}')||'{}');var m=s.mode||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);if(s.accent&&s.accent!=='neutral')e.setAttribute('data-accent',s.accent);else e.removeAttribute('data-accent')}catch(_){}})()`
