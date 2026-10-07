import type { Workspace } from '@/types'

/** Workspace bez Stripe identifikátorů – ty se nikdy nevracejí klientovi. */
export function publicWorkspace(ws: Workspace): Omit<Workspace, 'stripe_customer_id' | 'stripe_subscription_id'> {
  const { stripe_customer_id: _c, stripe_subscription_id: _s, ...rest } = ws
  void _c
  void _s
  return rest
}
