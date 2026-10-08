import 'server-only'
import { requireAdminPage } from '@/lib/admin/require-admin'

/**
 * Ověří, že je přihlášený uživatel admin (Clerk publicMetadata.role === 'admin'); jinak ho přesměruje na /dashboard.
 * Role se čte přímo z Clerk uživatele, ne ze session tokenu (ten ji bez zvláštní konfigurace Clerku neobsahuje,
 * takže by kontrola přes sessionClaims.metadata.role admina nikdy nepustila).
 * Volá se na začátku každé admin stránky i server action; vrací Clerk ID admina.
 */
export async function requireAdmin(): Promise<string> {
  return requireAdminPage()
}
