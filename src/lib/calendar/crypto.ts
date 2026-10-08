import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Konfigurace napojení (OAuth tokeny, hesla CalDAV) se šifruje AES-256-GCM, pokud je nastaven CALENDAR_ENCRYPTION_KEY.
// Bez klíče se ukládá nešifrovaně (projekt jinde šifrování nepoužívá); v produkci klíč nastavte.

const keyBytes = () => {
  const k = process.env.CALENDAR_ENCRYPTION_KEY
  return k ? createHash('sha256').update(k).digest() : null
}

export type StoredConfig = { v: 0; data: unknown } | { v: 1; iv: string; tag: string; data: string }

export function encryptConfig(value: unknown): StoredConfig {
  const key = keyBytes()
  if (!key) return { v: 0, data: value }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }
}

export function decryptConfig<T>(stored: unknown): T {
  const s = stored as StoredConfig | null
  if (!s || typeof s !== 'object') throw new Error('Calendar config is empty')
  if (s.v === 0) return s.data as T
  const key = keyBytes()
  if (!key) throw new Error('CALENDAR_ENCRYPTION_KEY is required to read this calendar connection')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(s.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(s.tag, 'base64'))
  const plain = Buffer.concat([decipher.update(Buffer.from(s.data, 'base64')), decipher.final()]).toString('utf8')
  return JSON.parse(plain) as T
}
