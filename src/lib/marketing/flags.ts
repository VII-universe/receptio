// Přepínače funkcí veřejného webu. Živý demo hovor (Vapi) se smí zapnout jen výslovně: NEXT_PUBLIC_LIVE_DEMO_CALL=1.
export const LIVE_DEMO_CALL = process.env.NEXT_PUBLIC_LIVE_DEMO_CALL === '1'

/** Kontaktní e-mail na webu. */
export const CONTACT_EMAIL = 'hello@receptio.dev'
