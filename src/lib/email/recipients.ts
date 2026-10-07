import 'server-only'
import { clerkClient } from '@clerk/nextjs/server'

/** E-mail a jméno vlastníka workspace z Clerk (null, pokud účet nejde načíst). */
export async function getOwnerContact(clerkUserId: string): Promise<{ email: string | null; name: string }> {
  try {
    const user = await (await clerkClient()).users.getUser(clerkUserId)
    return {
      email: user.primaryEmailAddress?.emailAddress ?? null,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    }
  } catch (e) {
    console.error('Email: failed to load owner', e)
    return { email: null, name: '' }
  }
}

/** Odkaz do e-mailu jen s protokolem http(s); jinak null (ochrana před javascript: apod.). */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}
