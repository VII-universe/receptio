/** Události, na které se lze přihlásit (zatím jen dokončený hovor). */
export const WEBHOOK_EVENTS = ['call.completed'] as const
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export const isWebhookEvents = (v: unknown): v is WebhookEvent[] =>
  Array.isArray(v) && v.length > 0 && v.every((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e))

export const MAX_WEBHOOKS_PER_WORKSPACE = 10

// Sloupce, které se vracejí klientovi. Secret mezi nimi NENÍ (zobrazuje se jen při vytvoření).
export const WEBHOOK_PUBLIC_COLUMNS =
  'id, name, url, events, is_active, created_at, last_triggered_at, last_status_code, failure_count'
