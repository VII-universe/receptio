import { getTranslations } from 'next-intl/server'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteNav } from '@/components/marketing/site-nav'
import type { LegalDoc } from '@/content/legal/types'
import { LEGAL_UPDATED } from '@/lib/legal'

/** Společná kostra právních stránek (denní vzhled veřejného webu, dlouhý text na krémovém pozadí). */
export async function LegalPage({ doc, locale, translated }: { doc: LegalDoc; locale: string; translated: boolean }) {
  const t = await getTranslations('legal')
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(LEGAL_UPDATED))

  return (
    <>
      <SiteNav />
      <main id="obsah" data-tone="light" className="phase-morning flex-1 px-5 pb-24 pt-36 sm:pb-32 sm:pt-44">
        <article className="mx-auto max-w-3xl">
          <h1 className="mk-display text-[clamp(2.5rem,5vw,4rem)]">{doc.title}</h1>
          <p className="mk-mono mt-5 text-sm text-fg-soft">
            {t('updated')}: {date}
          </p>
          {!translated && <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-[0.9375rem] text-fg-soft">{t('fallbackNote')}</p>}
          {doc.intro && <p className="mk-lead mt-10">{doc.intro}</p>}

          {doc.sections.map((s) => (
            <section key={s.heading} className="mt-12">
              <h2 className="text-2xl font-semibold tracking-[-0.015em]">{s.heading}</h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="mt-4 leading-relaxed text-fg-soft">
                  {p}
                </p>
              ))}
              {s.items && (
                <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed text-fg-soft marker:text-accent-text">
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
              {s.after?.map((p) => (
                <p key={p} className="mt-4 leading-relaxed text-fg-soft">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </>
  )
}
