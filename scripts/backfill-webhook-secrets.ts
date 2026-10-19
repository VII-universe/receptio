// Jednorázově doplní vlastní tajemství webhooku agentům, kteří ho ještě nemají (a nastaví ho i ve Vapi).
// Spustit: npm run vapi:backfill-secrets -- --dry-run   (jen vypíše, co by se stalo)
//          npm run vapi:backfill-secrets                (provede změny)
// Skript je bezpečné spustit opakovaně: zpracuje jen agenty bez řádku v agent_secrets.
// Pořadí je DB (tabulka agent_secrets), pak Vapi; selže-li Vapi, secret se z DB smaže, aby agentovi webhooky dál procházely.
// Po doběhnutí bez chyb už není VAPI_WEBHOOK_SECRET potřeba (smí se smazat z Vercelu).
import { createAdminClient } from '@/lib/supabase/admin'
import { updateVapiWebhookSecret } from '@/lib/vapi/agents'
import { clearAgentWebhookSecret, generateWebhookSecret, setAgentWebhookSecret } from '@/lib/vapi/webhook-secret'

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  // URL webhooku se skládá z NEXT_PUBLIC_APP_URL; špatná hodnota by agentům přesměrovala webhooky jinam.
  if (!appUrl.startsWith('https://') || /localhost|127\.0\.0\.1/.test(appUrl)) {
    throw new Error(`NEXT_PUBLIC_APP_URL must be the public https address, got "${appUrl}"`)
  }

  const supabase = createAdminClient()
  const [agents, secrets] = await Promise.all([
    supabase.from('agents').select('id, name, vapi_agent_id').not('vapi_agent_id', 'is', null),
    supabase.from('agent_secrets').select('agent_id'),
  ])
  if (agents.error) throw agents.error
  if (secrets.error) throw secrets.error
  const have = new Set(secrets.data.map((s) => s.agent_id as string))
  const data = agents.data.filter((a) => !have.has(a.id as string))

  console.log(`${dryRun ? '[dry run] ' : ''}Agents without their own webhook secret: ${data.length}`)
  let failed = 0
  for (const agent of data) {
    if (dryRun) {
      console.log(`  would update ${agent.name} (${agent.id})`)
      continue
    }
    const secret = generateWebhookSecret()
    try {
      await setAgentWebhookSecret(agent.id as string, secret)
    } catch (saveError) {
      failed++
      console.error(`  ✗ ${agent.name}: saving to DB failed`, saveError instanceof Error ? saveError.message : saveError)
      continue
    }
    try {
      await updateVapiWebhookSecret(agent.vapi_agent_id as string, secret)
      console.log(`  ✓ ${agent.name}`)
    } catch (e) {
      failed++
      await clearAgentWebhookSecret(agent.id as string).catch(() => {})
      console.error(`  ✗ ${agent.name}: Vapi update failed, secret reverted`, e instanceof Error ? e.message : e)
    }
  }
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
