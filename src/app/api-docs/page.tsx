import Link from 'next/link'

export const metadata = {
  title: 'Receptio API',
  description: 'REST API for accessing Receptio calls and agents.',
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
          <span className="font-medium">Authentication:</span> Bearer token in the <code>Authorization</code> header
        </p>
        <p className="text-muted-foreground">
          Create an API key in the app under Settings → API. The key is shown only once.
        </p>
      </div>

      <section className="mt-10 flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Calls</h2>
        <h3 className="font-medium">GET /v1/calls</h3>
        <p className="text-sm text-muted-foreground">
          List of calls, newest first. Parameters: <code>limit</code> (max. 100, default 20), <code>offset</code>,{' '}
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
      "summary": "The customer asked about opening hours.",
      "started_at": "2026-10-06T12:32:00.000Z",
      "ended_at": "2026-10-06T12:34:34.000Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}`}</Code>

        <h3 className="mt-4 font-medium">GET /v1/calls/&#123;id&#125;</h3>
        <p className="text-sm text-muted-foreground">Call details including the text transcript (<code>transcript</code>).</p>
        <Code>{`curl "${BASE}/calls/{id}" \\
  -H "Authorization: Bearer rcp_live_..."`}</Code>
      </section>

      <section className="mt-10 flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Agents</h2>
        <h3 className="font-medium">GET /v1/agents</h3>
        <Code>{`curl "${BASE}/agents" \\
  -H "Authorization: Bearer rcp_live_..."`}</Code>
        <Code>{`{ "data": [ { "id": "…", "name": "Aida", "is_active": true, "created_at": "2026-10-01T09:00:00.000Z" } ] }`}</Code>

        <h3 className="mt-4 font-medium">GET /v1/agents/&#123;id&#125;</h3>
        <p className="text-sm text-muted-foreground">The agent with the number of calls in the current month (<code>calls_this_month</code>).</p>
        <Code>{`curl "${BASE}/agents/{id}" \\
  -H "Authorization: Bearer rcp_live_..."`}</Code>
      </section>

      <section className="mt-10 flex flex-col gap-3 text-sm">
        <h2 className="text-xl font-semibold">Errors and limits</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code>401</code> – missing, invalid, revoked or expired key
          </li>
          <li>
            <code>403</code> – the key does not have the required scope
          </li>
          <li>
            <code>404</code> – the record does not exist or does not belong to your account
          </li>
          <li>
            <code>429</code> – limit of 100 requests per minute per key exceeded (<code>Retry-After</code> header)
          </li>
        </ul>
        <p className="text-muted-foreground">
          Error responses have the form <code>{`{ "error": "…" }`}</code>. The API does not return call transcripts as
          messages or call costs.
        </p>
      </section>
    </div>
  )
}
