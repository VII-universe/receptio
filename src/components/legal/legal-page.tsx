import { getTranslations } from 'next-intl/server'
import { MarketingFooter } from '@/components/layout/marketing-footer'
import { Navbar } from '@/components/layout/navbar'
import { ForceDark } from '@/components/theme/theme-provider'
import type { LegalDoc } from '@/content/legal/types'
import { LEGAL_UPDATED } from '@/lib/legal'

/** Společná kostra právních stránek (tmavý marketingový vzhled). */
export async function LegalPage({ doc, locale, translated }: { doc: LegalDoc; locale: string; translated: boolean }) {
  const t = await getTranslations('legal')
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(LEGAL_UPDATED))

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <ForceDark />
      <Navbar />
      <main className="flex-1 px-4 py-16 sm:py-24">
        <article className="mx-auto max-w-3xl">
          <h1 className="rc-heading text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{doc.title}</h1>
          <p className="mt-4 text-sm text-zinc-500">
            {t('updated')}: {date}
          </p>
          {!translated && <p className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-zinc-400">{t('fallbackNote')}</p>}
          {doc.intro && <p className="mt-8 text-lg leading-relaxed text-zinc-300">{doc.intro}</p>}

          {doc.sections.map((s) => (
            <section key={s.heading} className="mt-10">
              <h2 className="text-xl font-semibold tracking-tight text-white">{s.heading}</h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="mt-3 leading-relaxed text-zinc-400">
                  {p}
                </p>
              ))}
              {s.items && (
                <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-zinc-400 marker:text-zinc-600">
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
              {s.after?.map((p) => (
                <p key={p} className="mt-3 leading-relaxed text-zinc-400">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <MarketingFooter />
    </div>
  )
}
