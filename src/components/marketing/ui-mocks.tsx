// Stylizované ukázky aplikace pro sekci „Jak to funguje“ (podle skutečného přehledu a nastavení asistenta).
// Jsou dekorativní: obsah kroků nese text vedle nich, proto aria-hidden.
import { IconCheck, IconMail } from './icons'

const frame = 'rounded-[1.25rem] bg-white p-5 text-ink shadow-[0_24px_50px_-28px_rgb(20_22_31/0.45)] ring-1 ring-ink/8'
const label = 'text-[0.75rem] font-medium uppercase tracking-[0.06em] text-ink-soft'

export function HoursMock({ t }: { t: (k: string) => string }) {
  const rows = [
    [t('weekdays'), '8:00 – 18:00'],
    [t('saturday'), '9:00 – 13:00'],
    [t('sunday'), t('closed')],
  ]
  return (
    <div aria-hidden className={frame}>
      <p className={label}>{t('hours')}</p>
      <dl className="mt-3 divide-y divide-ink/8 text-[0.9375rem]">
        {rows.map(([d, h]) => (
          <div key={d} className="flex items-center justify-between py-2">
            <dt className="font-medium">{d}</dt>
            <dd className="mk-mono text-[0.875rem] text-ink-soft">{h}</dd>
          </div>
        ))}
      </dl>
      <p className={`${label} mt-4`}>{t('faq')}</p>
      <div className="mt-2 rounded-xl bg-day px-3.5 py-3 text-[0.9375rem]">
        <p className="font-medium">{t('faqQ')}</p>
        <p className="text-ink-soft">{t('faqA')}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className={label}>{t('tone')}</p>
        <span className="rounded-full bg-aida/15 px-3 py-1 text-[0.8125rem] font-medium text-[#9a3a10]">{t('toneValue')}</span>
      </div>
    </div>
  )
}

export function NumberMock({ t }: { t: (k: string) => string }) {
  return (
    <div aria-hidden className={frame}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={label}>{t('number')}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-1 text-xs font-semibold text-[#1c6b45]">
          <span className="size-1.5 rounded-full bg-ok" />
          {t('active')}
        </span>
      </div>
      <p className="mk-mono mt-4 whitespace-nowrap text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium tracking-[-0.02em]">+420 228 ••• 455</p>
      <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-day px-3.5 py-3">
        <div className="text-[0.9375rem]">
          <p className="font-medium">{t('forward')}</p>
          <p className="text-[0.8125rem] text-ink-soft">{t('forwardHint')}</p>
        </div>
        <span className="relative h-6 w-10 shrink-0 rounded-full bg-ink">
          <span className="absolute right-0.5 top-0.5 size-5 rounded-full bg-white" />
        </span>
      </div>
    </div>
  )
}

export function NotificationMock({ t }: { t: (k: string) => string }) {
  return (
    <div aria-hidden className="rounded-[2rem] bg-night p-3 shadow-[0_30px_60px_-30px_rgb(14_22_48/0.8)]">
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-moon/15" />
      <div className="rounded-[1.25rem] bg-moon/95 p-4 text-ink backdrop-blur">
        <div className="flex items-center gap-2 text-[0.75rem] text-ink-soft">
          <span className="flex size-5 items-center justify-center rounded-md bg-aida text-white">
            <IconMail size={13} />
          </span>
          <span className="font-semibold text-ink">Receptio</span>
          <span className="ml-auto">{t('now')}</span>
        </div>
        <p className="mt-2 text-[0.9375rem] font-semibold leading-snug">{t('notifTitle')}</p>
        <p className="mt-1 text-[0.9375rem] leading-snug text-ink-soft">{t('notifBody')}</p>
        <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] text-ink-soft">
          <IconCheck size={13} className="text-[#1c6b45]" />
          {t('notifMeta')}
        </p>
      </div>
    </div>
  )
}
