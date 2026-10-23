'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { VOICE_CATALOG, defaultVoiceFor } from '@/lib/agents/voices'
import { VOICE_TONES as TONES, voiceKey, type VoiceSamples, type VoiceTone as Tone } from '@/lib/marketing/voice-samples'
import { cn } from '@/lib/utils'
import { claimAudio, onAudioClaim } from './audio-focus'
import { IconPause, IconPlay } from './icons'
import { SectionHeading } from './section-heading'

/** Hlasy z katalogu produktu: výchozí hlas jazyka a dva další (ženský a mužský). */
function voicesFor(locale: string) {
  const parse = (v: (typeof VOICE_CATALOG)[number]) => ({
    id: v.id,
    key: voiceKey(v.name),
    name: v.name.replace(/\s*\(.*\)\s*$/, ''),
    gender: v.name.includes('(male)') ? ('male' as const) : ('female' as const),
  })
  const def = defaultVoiceFor(locale)
  const ordered = [...VOICE_CATALOG].sort((a, b) => Number(b.id === def) - Number(a.id === def))
  const first = ordered[0]
  const female = ordered.find((v) => v !== first && !v.name.includes('(male)'))
  const male = ordered.find((v) => v !== first && v.name.includes('(male)'))
  return { defaultId: def, voices: [first, female, male].filter((v): v is (typeof VOICE_CATALOG)[number] => !!v).map(parse) }
}

/**
 * Sekce hlasu: výběr hlasu, jména a tónu. Přepnutí hlasu nebo tónu během přehrávání rovnou
 * přehraje stejnou větu jinak. Nahrávky jsou ve VoiceSamples (zjištěné při buildu).
 */
export function VoiceSection({ samples }: { samples: VoiceSamples | null }) {
  const t = useTranslations('marketing.voice')
  const td = useTranslations('marketing.demo')
  const locale = useLocale()
  const { defaultId, voices } = voicesFor(locale)
  const [voice, setVoice] = useState(voices[0]?.id)
  const [tone, setTone] = useState<Tone>('friendly')
  const [name, setName] = useState('Aida')
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const nameId = useId()
  const shownName = name.trim() || 'Aida'
  const keyFor = (id: string | undefined, tn: Tone) => `${voices.find((v) => v.id === id)?.key}-${tn}`
  const clip = samples?.clips[keyFor(voice, tone)]

  const play = useCallback(
    (key: string) => {
      const sources = samples?.clips[key]
      if (!sources) return
      let audio = audioRef.current
      if (!audio) {
        audio = new Audio()
        audio.preload = 'metadata'
        audio.addEventListener('playing', () => setPlaying(true))
        audio.addEventListener('pause', () => setPlaying(false))
        audio.addEventListener('ended', () => setPlaying(false))
        audioRef.current = audio
      }
      const src = sources.find((s) => audio.canPlayType(s.type) !== '') ?? sources[sources.length - 1]
      if (!audio.src.endsWith(src.src)) audio.src = src.src
      audio.currentTime = 0
      claimAudio('voice')
      void audio.play().catch(() => setPlaying(false))
    },
    [samples]
  )
  const stop = useCallback(() => audioRef.current?.pause(), [])

  // Jiná ukázka na stránce (hero, karty odvětví) převzala zvuk: tady ztichnout.
  useEffect(() => onAudioClaim((owner) => owner !== 'voice' && stop()), [stop])
  useEffect(() => () => audioRef.current?.pause(), [])

  const choose = (id: string, tn: Tone) => {
    setVoice(id)
    setTone(tn)
    if (playing) play(keyFor(id, tn))
  }

  const pill = (active: boolean) =>
    cn('min-h-11 rounded-full px-4 text-[0.9375rem] font-medium transition-colors', active ? 'bg-ink text-day' : 'bg-white/60 text-ink hover:bg-white')

  return (
    <section data-tone="light" aria-labelledby="voice-title" className="phase-golden mk-section">
      <div className="mk-container grid gap-14 lg:grid-cols-2 lg:items-center">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} lead={t('text')} titleId="voice-title" />

        <div className="mk-card flex flex-col gap-7 p-6 md:p-9">
          <fieldset>
            <legend className="mk-mono mb-3 text-xs uppercase tracking-[0.08em] text-fg-soft">{t('voiceLabel')}</legend>
            <div className="flex flex-wrap gap-2">
              {voices.map((v) => (
                <label key={v.id} className={cn(pill(voice === v.id), 'inline-flex cursor-pointer items-center gap-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2')}>
                  <input type="radio" name="mk-voice" value={v.id} checked={voice === v.id} onChange={() => choose(v.id, tone)} className="sr-only" />
                  {v.name}
                  <span className="text-[0.8125rem] opacity-70">
                    {t(v.gender)}
                    {v.id === defaultId && ` · ${t('default')}`}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-7 sm:grid-cols-2">
            <div>
              <label htmlFor={nameId} className="mk-mono mb-3 block text-xs uppercase tracking-[0.08em] text-fg-soft">
                {t('nameLabel')}
              </label>
              <input
                id={nameId}
                value={name}
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-white px-4 text-lg font-medium text-ink outline-none transition-colors focus:border-ink"
              />
            </div>
            <fieldset>
              <legend className="mk-mono mb-3 text-xs uppercase tracking-[0.08em] text-fg-soft">{t('toneLabel')}</legend>
              <div className="flex gap-2">
                {TONES.map((id) => (
                  <label key={id} className={cn(pill(tone === id), 'inline-flex cursor-pointer items-center has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2')}>
                    <input type="radio" name="mk-tone" value={id} checked={tone === id} onChange={() => choose(voice, id)} className="sr-only" />
                    {t(`tones.${id}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-night p-4 text-moon md:p-5">
            <button
              type="button"
              disabled={!clip}
              aria-label={playing ? td('pause') : t('play')}
              aria-pressed={playing}
              onClick={() => (playing ? stop() : play(keyFor(voice, tone)))}
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-aida text-ink transition-transform hover:scale-105 disabled:opacity-50"
            >
              {playing ? <IconPause size={20} /> : <IconPlay size={22} className="translate-x-0.5" />}
            </button>
            <p className="min-w-0 flex-1 text-lg leading-snug">{t(`sample.${tone}`, { name: shownName })}</p>
            <span aria-hidden className={cn('story-bars h-5 shrink-0 text-aida transition-opacity', playing ? 'opacity-100' : 'opacity-0')}>
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>
          <p className="text-sm text-fg-soft">
            {t('note')}
            {samples?.placeholder && <> {td('placeholder')}</>}
            {samples && samples.lang !== locale && <> {samples.lang === 'cs' ? t('otherLanguage') : t('otherLanguageEn')}</>}
          </p>
        </div>
      </div>
    </section>
  )
}
