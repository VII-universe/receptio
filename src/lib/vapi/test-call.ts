// Pouze pro vývoj, není součástí aplikace. Vytvoří testovacího agenta ve Vapi a vypíše jeho ID.
// Spustit: npm run vapi:test
// (--conditions=react-server vypne hlášku z 'server-only', --env-file načte .env.local)
import { createVapiAgent } from './agents'

async function main() {
  const agent = await createVapiAgent({
    name: 'Aida',
    language: 'cs',
    greetingMessage: 'Dobrý den, tady Aida z testovací restaurace. Jak vám mohu pomoci?',
    customInstructions: 'Jsi testovací AI recepční pro restauraci. Přijímáš rezervace.',
    faq: [{ question: 'Kdy máte otevřeno?', answer: 'Otevřeno máme od pondělí do neděle 11-22h.' }],
  })
  console.log('✅ Agent vytvořen:', agent.id)
  console.log('Agent ID uložit do .env jako TEST_VAPI_AGENT_ID=' + agent.id)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
