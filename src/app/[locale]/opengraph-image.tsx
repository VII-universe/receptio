import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'
import { isLocale, LOCALES, routing } from '@/i18n/routing'
import { buildCity } from '@/lib/marketing/city'

// Obrázek pro sdílení (Open Graph): noční město, ve kterém svítí jen Aidino okno, nad ním orb a claim z hero.
// Vykresluje se při buildu pro každý jazyk. Písma: General Sans (latinka), Inter (cyrilice, řečtina, OFL).

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Jazyky, jejichž písmo General Sans nemá (stejně jako .mk[data-script='alt'] na webu). */
const ALT_SCRIPT = new Set(['bg', 'el'])

const font = (file: string) => readFile(join(process.cwd(), 'src/assets/og', file))

export const alt = 'Receptio'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : routing.defaultLocale
  const t = await getTranslations({ locale, namespace: 'marketing.hero' })

  // Claim: „…nikdy <em>nevyhoří.</em>“ → slova, zvýrazněná část v barvě Aidy (Satori neumí řádkový tok se spany).
  const title = t.raw('title').replace(/­/g, '') as string
  const [, before = title, em = '', after = ''] = title.match(/^(.*?)<em>(.*?)<\/em>(.*)$/) ?? []
  const words = [
    ...before.split(' ').map((w) => ({ w, em: false })),
    ...em.split(' ').map((w) => ({ w, em: true })),
    ...after.split(' ').map((w) => ({ w, em: false })),
  ].filter((x) => x.w)
  const fontSize = title.length <= 42 ? 84 : title.length <= 50 ? 74 : 66

  const altScript = ALT_SCRIPT.has(locale)
  const display = altScript ? 'InterC, InterG, InterL, InterLX' : 'GeneralSans, InterL, InterLX'
  const text = 'InterL, InterLX, InterC, InterG'

  // Město ve viewBoxu 1440 × 260, zmenšené na šířku obrázku.
  const city = buildCity()
  const aida = city.windows.find((w) => w.aida)
  const k = 1200 / 1440
  const cityH = Math.round(260 * k)

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', position: 'relative', background: 'linear-gradient(180deg, #1d2858 0%, #0e1630 72%)', color: '#EDEBF5', fontFamily: text }}>
        {/* hvězdy */}
        {[
          [610, 70], [702, 148], [1132, 54], [1060, 300], [560, 210], [1160, 210], [770, 40], [980, 24], [660, 290],
        ].map(([x, y], i) => (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: 3, height: 3, borderRadius: 3, background: 'rgba(237,235,245,0.55)' }} />
        ))}

        {/* orb Aidy se září */}
        <div style={{ position: 'absolute', left: 690, top: -40, width: 540, height: 540, borderRadius: 540, background: 'radial-gradient(circle, rgba(255,138,76,0.42) 0%, rgba(255,138,76,0.12) 40%, rgba(255,138,76,0) 68%)' }} />
        {/* vlny hlasu kolem orbu */}
        {[
          [176, 0.3],
          [214, 0.16],
          [256, 0.08],
        ].map(([r, a]) => (
          <div key={r} style={{ position: 'absolute', left: 960 - r, top: 230 - r, width: r * 2, height: r * 2, borderRadius: r * 2, border: `2px solid rgba(255,154,94,${a})` }} />
        ))}
        <div style={{ position: 'absolute', left: 830, top: 100, width: 260, height: 260, borderRadius: 260, background: 'radial-gradient(circle at 36% 32%, #fff3e6 0%, #ffc59a 18%, #ff8a4c 52%, #c4532a 100%)', boxShadow: '0 0 90px 24px rgba(255,138,76,0.38)' }} />

        {/* noční město: zhasnutá okna, svítí jen Aidino */}
        {aida && (
          <div style={{ position: 'absolute', left: (aida.x + 6) * k - 110, top: 630 - cityH + (aida.y + 8) * k - 110, width: 220, height: 220, borderRadius: 220, background: 'radial-gradient(circle, rgba(255,154,90,0.7) 0%, rgba(255,138,76,0.2) 35%, rgba(255,138,76,0) 70%)' }} />
        )}
        <svg width={1200} height={cityH} viewBox="0 0 1440 260" style={{ position: 'absolute', left: 0, bottom: 0 }}>
          {city.buildings.map((b, i) => (
            <rect key={i} x={b.x} y={260 - b.h} width={b.w} height={b.h} fill="#070b1f" />
          ))}
          {city.windows
            .filter((w) => !w.aida)
            .map((w, i) => (
              <rect key={i} x={w.x} y={w.y} width={10} height={14} rx={1.5} fill="#111938" />
            ))}
          {aida && <rect x={aida.x - 1} y={aida.y - 2} width={13} height={18} rx={1.5} fill="#ffb070" />}
        </svg>

        {/* logo, štítek a claim */}
        <div style={{ position: 'absolute', left: 72, top: 64, width: 700, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'GeneralSans', fontSize: 34, letterSpacing: '-0.03em' }}>
            <div style={{ width: 26, height: 26, borderRadius: 26, background: 'radial-gradient(circle at 35% 30%, #ffd2b0, #ff8a4c 45%, #e0622a 75%)', boxShadow: '0 0 18px 4px rgba(255,138,76,0.45)' }} />
            Receptio
          </div>
          <div style={{ marginTop: 44, fontSize: 24, color: '#ffb98c', letterSpacing: '0.02em' }}>{t('eyebrow')}</div>
          <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', fontFamily: display, fontWeight: altScript ? 700 : 600, fontSize, lineHeight: 1.04, letterSpacing: altScript ? '-0.045em' : '-0.035em' }}>
            {words.map(({ w, em }, i) => (
              <span key={i} style={{ marginRight: Math.round(fontSize * 0.24), color: em ? '#ff9a5e' : '#EDEBF5' }}>
                {w}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'GeneralSans', data: await font('GeneralSans-600.ttf'), weight: 600, style: 'normal' },
        { name: 'InterL', data: await font('inter-latin-500-normal.woff'), weight: 500, style: 'normal' },
        { name: 'InterLX', data: await font('inter-latin-ext-500-normal.woff'), weight: 500, style: 'normal' },
        { name: 'InterC', data: await font('inter-cyrillic-500-normal.woff'), weight: 500, style: 'normal' },
        { name: 'InterG', data: await font('inter-greek-500-normal.woff'), weight: 500, style: 'normal' },
        { name: 'InterL', data: await font('inter-latin-700-normal.woff'), weight: 700, style: 'normal' },
        { name: 'InterLX', data: await font('inter-latin-ext-700-normal.woff'), weight: 700, style: 'normal' },
        { name: 'InterC', data: await font('inter-cyrillic-700-normal.woff'), weight: 700, style: 'normal' },
        { name: 'InterG', data: await font('inter-greek-700-normal.woff'), weight: 700, style: 'normal' },
      ],
    }
  )
}
