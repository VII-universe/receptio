'use client'

import { useId, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { VOICE_CATALOG, defaultVoiceFor } from '@/lib/agents/voices'
import { cn } from '@/lib/utils'
import { IconPlay } from './icons'
import { SectionHeading } from './section-heading'

const TONES = ['formal', 'friendly'] as const
type Tone = (typeof TONES)[number]

/** Hlasy z katalogu produktu: výchozí hlas jazyka a dva další (ženský a mužský). */
function voicesFor(locale: string) {
  const parse = (v: (typeof VOICE_CATALOG)[number]) => ({
    id: v.id,
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

export function VoiceSection() {
  const t = useTranslations('marketing.voice')
  const locale = useLocale()
  const { defaultId, voices } = voicesFor(locale)
  const [voice, setVoice] = useState(voices[0]?.id)
  const [tone, setTone] = useState<Tone>('friendly')
  const [name, setName] = useState('Aida')
  const nameId = useId()
  const shownName = name.trim() || 'Aida'

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
                  <input type="radio" name="mk-voice" value={v.id} checked={voice === v.id} onChange={() => setVoice(v.id)} className="sr-only" />
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
                    <input type="radio" name="mk-tone" value={id} checked={tone === id} onChange={() => setTone(id)} className="sr-only" />
                    {t(`tones.${id}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-night p-4 text-moon md:p-5">
            <button
              type="button"
              aria-label={t('play')}
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-aida text-ink transition-transform hover:scale-105"
            >
              <IconPlay size={22} className="translate-x-0.5" />
            </button>
            <p className="text-lg leading-snug" aria-live="polite">
              {t(`sample.${tone}`, { name: shownName })}
            </p>
          </div>
          <p className="text-sm text-fg-soft">{t('note')}</p>
        </div>
      </div>
    </section>
  )
}
