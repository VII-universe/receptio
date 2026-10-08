// Údaje o provozovateli pro právní dokumenty (zásady ochrany osobních údajů, podmínky, cookies).
// Vyplňují se v proměnných prostředí (Vercel → Environment Variables); dokud chybí, dokumenty ukazují [●].
// Údaje musí odpovídat zápisu v obchodním rejstříku, jinak jsou dokumenty právně neúplné.

const PLACEHOLDER = '[●]'
const v = (value: string | undefined) => value?.trim() || PLACEHOLDER

export const LEGAL = {
  name: v(process.env.NEXT_PUBLIC_LEGAL_NAME), // obchodní firma
  companyId: v(process.env.NEXT_PUBLIC_LEGAL_ID), // IČO
  address: v(process.env.NEXT_PUBLIC_LEGAL_ADDRESS), // sídlo
  registry: v(process.env.NEXT_PUBLIC_LEGAL_REGISTRY), // zápis v obchodním rejstříku (soud, oddíl, vložka)
  email: v(process.env.NEXT_PUBLIC_LEGAL_EMAIL), // kontakt pro ochranu osobních údajů
}

export type LegalInfo = typeof LEGAL

export const LEGAL_UPDATED = '2026-10-08'

/** Které údaje o provozovateli ještě chybí (pro kontrolu před ostrým provozem). */
export const missingLegalFields = () =>
  (Object.entries(LEGAL) as [keyof LegalInfo, string][]).filter(([, value]) => value === PLACEHOLDER).map(([key]) => key)
