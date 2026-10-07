// Pouze pro vývoj, není součástí aplikace. Vytvoří testovacího agenta ve Vapi a vypíše jeho ID.
// Spustit: npm run vapi:test
// (--conditions=react-server vypne hlášku z 'server-only', --env-file načte .env.local)
import { createVapiAgent } from './agents'

async function main() {
  const agent = await createVapiAgent({
    name: 'Aida',
    language: 'cs',
    firstMessage: 'Hello, this is Aida from the test restaurant. How can I help you?',
    systemPrompt:
      'You are Aida, a test AI receptionist for a restaurant. You take reservations. We are open Monday to Sunday, 11-22.',
    voiceId: 'XB0fDUnXU5powFXDhCwa',
    endCallPhrases: ['nashledanou', 'na shledanou'],
  })
  console.log('✅ Agent created:', agent.id)
  console.log('Save the agent ID to .env as TEST_VAPI_AGENT_ID=' + agent.id)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
