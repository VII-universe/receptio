'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { IconVolume, IconVolumeOff } from './icons'
import { setSoundsEnabled, useSoundsEnabled } from './micro-sounds'

/** Přepínač mikrozvuků (zvonek v příběhu, cinknutí notifikace). Ve výchozím stavu vypnuto. */
export function SoundToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const t = useTranslations('marketing.nav')
  const on = useSoundsEnabled()
  const label = on ? t('soundOff') : t('soundOn')
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={withLabel ? undefined : label}
      title={label}
      onClick={() => setSoundsEnabled(!on)}
      className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-full transition-colors hover:bg-fg/8', withLabel ? 'px-3' : 'w-11', className)}
    >
      {on ? <IconVolume size={20} /> : <IconVolumeOff size={20} className="opacity-70" />}
      {withLabel && <span className="text-sm">{label}</span>}
    </button>
  )
}
