import { redirect } from 'next/navigation'

// Původní stránka jednoho asistenta; správa agentů je nově v /dashboard/agents.
export default function LegacyAgentPage() {
  redirect('/dashboard/agents')
}
