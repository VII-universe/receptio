import { getTranslations } from 'next-intl/server'
import { cn } from '@/lib/utils'
import { STORY_CALLS, isDarkPhase } from '@/lib/marketing/story'
import { CallCard } from './call-card'
import { IconMessage } from './icons'
import { SectionHeading } from './section-heading'

/**
 * „24 hodin s Aidou“ jako časová osa: každá scéna má vlastní světlo dne, kartu vyřízeného hovoru
 * a notifikaci pro majitele. Je to i podoba pro omezený pohyb a bez JavaScriptu.
 */
export async function DayStory() {
  const t = await getTranslations('marketing.story')
  const tc = await getTranslations('marketing.common')
  const labels = {
    status: { incoming: t('status.incoming'), talking: t('status.talking'), done: t('status.done') },
    summary: t('summary'),
  }

  return (
    <section aria-labelledby="story-title" className="relative">
      <div data-tone="light" className="phase-morning">
        <div className="mk-container pb-8 pt-16 md:pb-12 md:pt-24">
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            titleId="story-title"
            lead={
              <>
                {t('intro')} <span className="mk-mono text-sm uppercase tracking-[0.08em]">· {t('note')}</span>
              </>
            }
          />
        </div>
      </div>

      <ol>
        {STORY_CALLS.map((call) => {
          const dark = isDarkPhase(call.phase)
          return (
            <li key={call.id} data-tone={dark ? 'dark' : 'light'} className={`phase-${call.phase}`}>
              <div className="mk-container grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
                <div className="flex min-w-0 flex-col gap-5">
                  <time className="mk-mono text-[clamp(3.5rem,9vw,7.5rem)] font-medium leading-none tracking-[-0.04em]" dateTime={call.time}>
                    {call.time}
                  </time>
                  <p className="mk-display mk-h3 max-w-[22ch]">{t(`calls.${call.id}.scene`)}</p>
                </div>
                <div className="flex min-w-0 flex-col items-start gap-4 md:items-end">
                  <CallCard
                    status="done"
                    time={call.time}
                    industry={call.industry}
                    business={t(`calls.${call.id}.business`)}
                    number={call.number ?? t('hiddenNumber')}
                    reason={tc('quote', { text: t(`calls.${call.id}.reason`) })}
                    result={t(`calls.${call.id}.result`)}
                    labels={labels}
                  />
                  <p
                    className={cn(
                      'flex w-full max-w-[26rem] items-center gap-3 rounded-2xl px-4 py-3 text-[0.9375rem]',
                      dark ? 'bg-moon/8 text-moon' : 'bg-ink/6 text-ink'
                    )}
                  >
                    <IconMessage size={20} className="shrink-0 text-accent-text" />
                    <span>
                      <span className="font-semibold">{t('phoneTitle')}:</span> {t(`calls.${call.id}.notif`)}
                    </span>
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div data-tone="dark" className="phase-night">
        <div className="mk-container flex flex-col gap-3 pb-24 pt-8 md:pb-36">
          <p className="mk-display mk-h2">{t('handled', { count: STORY_CALLS.length })}</p>
          <p className="mk-display mk-h2 text-accent-text">{t('missed')}</p>
        </div>
      </div>
    </section>
  )
}
