// Pouze pro vývoj, není součástí aplikace. Vytvoří testovacího agenta ve Vapi a vypíše jeho ID.
// Spustit: npm run vapi:test
// (--conditions=react-server vypne hlášku z 'server-only', --env-file načte .env.local)
import { createVapiAgent } from './agents'

async function main() {
  const agent = await createVapiAgent({
    name: 'Aida',
    language: 'cs',
    firstMessage: 'Dobrý den, tady Aida z testovací restaurace. Jak vám mohu pomoci?',
    systemPrompt:
      'Jsi Aida, testovací AI recepční pro restauraci. Přijímáš rezervace. Otevřeno máme od pondělí do neděle 11-22h.',
    voiceId: 'XB0fDUnXU5powFXDhCwa',
    endCallPhrases: ['nashledanou', 'na shledanou'],
  })
  console.log('✅ Agent vytvořen:', agent.id)
  console.log('Agent ID uložit do .env jako TEST_VAPI_AGENT_ID=' + agent.id)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
