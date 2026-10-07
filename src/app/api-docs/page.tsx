import Link from 'next/link'

export const metadata = {
  title: 'Receptio API',
  description: 'REST API pro přístup k hovorům a agentům Receptio.',
}

const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://receptio-tau.vercel.app').replace(/\/$/, '') + '/api/v1'

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  )
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Receptio
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Receptio API</h1>

      <div className="mt-6 flex flex-col gap-1 text-sm">
        <p>
          <span className="font-medium">Base URL:</span> <code>{BASE}</code>
        </p>
        <p>
          <span className="font-medium">Autentizace:</span> Bearer token v hlavičce <code>Authorization</code>
        </p>
        <p className="text-muted-foreground">
          API klíč vytvoříte v aplikaci v Nastavení → API. Klíč se zobrazí jen jednou.
        </p>
      </div>

      <section className="mt-10 flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Hovory</h2>
        <h3 className="font-medium">GET /v1/calls</h3>
        <p className="text-sm text-muted-foreground">
          Seznam hovorů od nejnovějšího. Parametry: <code>limit</code> (max. 100, výchozí 20), <code>offset</code>,{' '}
          <code>agent_id</code>.
        </p>
        <Code>{`curl "${BASE}/calls?limit=20" \\
  -H "Authorization: Bearer rcp_live_..."`}</Code>
        <Code>{`{
  "data": [
    {
      "id": "…",
      "agent_id": "…",
      "caller_number": "+420777123456",
      "duration": 154,
      "ended_reason": "customer-ended-call",
      "summary": "Zákazník se ptal na otevírací dobu.",
      "started_at": "2026-10-06T12:32:00.000Z",
      "ended_at": "2026-10-06T12:34:34.000Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}`}</Code>

        <h3 className="mt-4 font-medium">GET /v1/calls/&#123;id&#125;</h3>
        <p className="text-sm text-muted-foreground">Detail hovoru včetně textového přepisu (<code>transcript</code>).</p>
        <Code>{`curl "${BASE}/calls/{id}" \\
  -H "Authorization: Bearer rcp_live_..."`}</Code>
      </section>

      <section className="mt-10 flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Agenti</h2>
        <h3 className="font-medium">GET /v1/agents</h3>
        <Code>{`curl "${BASE}/agents" \\
  -H "Authorization: Bearer rcp_live_..."`}</Code>
        <Code>{`{ "data": [ { "id": "…", "name": "Aida", "is_active": true, "created_at": "2026-10-01T09:00:00.000Z" } ] }`}</Code>

        <h3 className="mt-4 font-medium">GET /v1/agents/&#123;id&#125;</h3>
        <p className="text-sm text-muted-foreground">Agent s počtem hovorů v aktuálním měsíci (<code>calls_this_month</code>).</p>
        <Code>{`curl "${BASE}/agents/{id}" \\
  -H "Authorization: Bearer rcp_live_..."`}</Code>
      </section>

      <section className="mt-10 flex flex-col gap-3 text-sm">
        <h2 className="text-xl font-semibold">Chyby a limity</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code>401</code> – chybějící, neplatný, odvolaný nebo vypršelý klíč
          </li>
          <li>
            <code>403</code> – klíč nemá potřebný rozsah (scope)
          </li>
          <li>
            <code>404</code> – záznam neexistuje nebo nepatří k vašemu účtu
          </li>
          <li>
            <code>429</code> – překročen limit 100 požadavků za minutu na klíč (hlavička <code>Retry-After</code>)
          </li>
        </ul>
        <p className="text-muted-foreground">
          Odpovědi s chybou mají tvar <code>{`{ "error": "…" }`}</code>. Přepisy hovorů ve formě zpráv ani ceny hovorů
          API nevrací.
        </p>
      </section>
    </div>
  )
}
