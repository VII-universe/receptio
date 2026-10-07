import 'server-only'
import { sendLimitWarning } from '@/lib/email/send-limit-warning'
import { syncCallsPaused } from './check-limit'

/**
 * Po dokončeném hovoru: při dosažení limitu pozastaví hovory workspace (calls_paused) a pošle upozornění.
 * Upozornění jde jen při přechodu do pozastaveného stavu, ne po každém dalším hovoru. Chyby se logují.
 */
export async function enforceMinutesAfterCall(workspaceId: string): Promise<void> {
  try {
    const { justPaused, check } = await syncCallsPaused(workspaceId)
    if (!justPaused) return
    await sendLimitWarning({ workspaceId, planName: check.plan, used: check.used, max: check.max }).catch((e) =>
      console.error('Billing: limit warning email failed', e)
    )
  } catch (e) {
    console.error('Billing: enforcing minutes limit failed', workspaceId, e)
  }
}
