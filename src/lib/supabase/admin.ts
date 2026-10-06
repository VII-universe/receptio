import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role klient obchází RLS – používej výhradně na serveru
// a vždy filtruj podle workspace přihlášeného uživatele.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
