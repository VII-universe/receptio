'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Mic, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseLimitError } from '@/lib/billing/limit-error'

type Phase = 'idle' | 'connecting' | 'live' | 'ended'
type Failure = 'notConfigured' | 'limit' | 'mic' | 'generic'

// Zkušební hovor je kratší než běžný: nikdo nemá donekonečna mluvit se zkoušeným agentem.
const MAX_TEST_SECONDS = 180

/** Testovací hovor s agentem přímo v prohlížeči (mikrofon + reproduktor), bez telefonního čísla. */
export function WebTestCall({ agentId, onFinished }: { agentId: string; onFinished?: () => void }) {
  const t = useTranslations('onboarding.test')
  const [phase, setPhase] = useState<Phase>('idle')
  const [failure, setFailure] = useState<Failure | null>(null)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const vapiRef = useRef<{ stop: () => Promise<void> } | null>(null)
  const finishedRef = useRef(false)

  const finish = useCallback(() => {
    setPhase('ended')
    setAgentSpeaking(false)
    vapiRef.current = null
    if (!finishedRef.current) {
      finishedRef.current = true
      onFinished?.()
    }
  }, [onFinished])

  // Opuštění stránky ukončí hovor, ať zbytečně neběží (a nestojí minuty).
  useEffect(() => () => void vapiRef.current?.stop().catch(() => {}), [])

  async function start() {
    setFailure(null)
    setPhase('connecting')
    try {
      const res = await fetch(`/api/agents/${agentId}/web-call`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFailure(data.code === 'not_configured' ? 'notConfigured' : parseLimitError(data) ? 'limit' : 'generic')
        setPhase('idle')
        return
      }

      const { default: Vapi } = await import('@vapi-ai/web')
      const vapi = new Vapi(data.publicKey as string)
      vapiRef.current = vapi
      vapi.on('call-start', () => setPhase('live'))
      vapi.on('call-end', finish)
      vapi.on('speech-start', () => setAgentSpeaking(true))
      vapi.on('speech-end', () => setAgentSpeaking(false))
      vapi.on('error', (e: unknown) => {
        const text = JSON.stringify(e ?? '').toLowerCase()
        setFailure(/permission|notallowed|microphone|mic/.test(text) ? 'mic' : 'generic')
        vapiRef.current = null
        setPhase('idle')
      })
      await vapi.start(data.assistantId as string, { maxDurationSeconds: MAX_TEST_SECONDS })
    } catch (e) {
      const text = String((e as Error)?.message ?? e).toLowerCase()
      setFailure(/permission|notallowed|microphone/.test(text) ? 'mic' : 'generic')
      vapiRef.current = null
      setPhase('idle')
    }
  }

  async function stop() {
    await vapiRef.current?.stop().catch(() => {})
    finish()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {phase === 'live' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <span className={`size-2.5 rounded-full ${agentSpeaking ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground/50'}`} />
          {agentSpeaking ? t('agentSpeaking') : t('listening')}
        </p>
      )}
      {phase === 'ended' && <p className="text-sm text-muted-foreground">{t('ended')}</p>}

      {phase === 'live' ? (
        <Button size="lg" variant="destructive" className="h-14 px-8 text-base" onClick={stop}>
          <PhoneOff />
          {t('hangUp')}
        </Button>
      ) : (
        <Button size="lg" className="h-14 px-8 text-base" onClick={start} disabled={phase === 'connecting'}>
          {phase === 'connecting' ? <Loader2 className="animate-spin" /> : <Mic />}
          {phase === 'connecting' ? t('connecting') : phase === 'ended' ? t('again') : t('start')}
        </Button>
      )}

      {failure && (
        <p role="alert" className="text-center text-sm text-destructive">
          {t(`failure.${failure}`)}
        </p>
      )}
    </div>
  )
}
