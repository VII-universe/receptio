// Nahrávky ukázek pro veřejný web přes ElevenLabs (text-to-speech/with-timestamps).
//
//   node --env-file=.env.local scripts/generate-demo-audio.mjs --lang cs,en [--only demo|voice] [--force]
//
// Demo hovory (public/audio/demo/<jazyk>/<obor>.{m4a,mp3,json}): repliky z marketing.demo.scripts.<obor>
// v messages/<jazyk>.json. Každá replika se generuje zvlášť (Aida a volající mají jiný hlas), pak se slepí
// do jednoho souboru a z časování znaků vznikne přepis se slovy (formát viz public/audio/demo/README.md).
// Ukázky hlasů (public/audio/voice/<jazyk>/<hlas>-<tón>.{m4a,mp3}): věty marketing.voice.sample.<tón>.
//
// Odpovědi ElevenLabs se ukládají do node_modules/.cache/elevenlabs, opakovaný běh je zdarma
// (--force vygeneruje znovu). Na konci vypíše spotřebu kreditů podle hlavičky character-cost.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(ROOT, 'node_modules/.cache/elevenlabs')
const KEY = process.env.ELEVENLABS_API_KEY
if (!KEY) throw new Error('Chybí ELEVENLABS_API_KEY (spusťte s --env-file=.env.local).')

const args = process.argv.slice(2)
const arg = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const LANGS = (arg('lang') ?? 'cs,en').split(',')
const ONLY = arg('only')
const FORCE = args.includes('--force')

// Stejný model jako agenti v produktu (src/lib/vapi/locale-map.ts) pro češtinu; zvládá všechny jazyky webu.
const MODEL = 'eleven_multilingual_v2'

// Aida: jeden stálý hlas z katalogu produktu (src/lib/agents/voices.ts, výchozí hlas češtiny „Charlotte“).
const AIDA = 'XB0fDUnXU5powFXDhCwa'
// Volající: v každém oboru jiný hlas, střídavě muž a žena (premade hlasy ElevenLabs, mimo katalog).
const CALLERS = {
  restaurant: 'iP95p4xoKVk53GoZ742B', // Chris, muž
  dental: 'cgSgspJ2msm6clMCkdW9', // Jessica, žena
  auto: 'TX3LPaxmHKxFdv7VOQHJ', // Liam, muž
  salon: 'XrExE9yKIg1WjnnlVkGX', // Matilda, žena
}
// Hlasy sekce „Zní jako člověk“: celý katalog produktu, klíč = první slovo názvu (viz voice-samples.ts).
const VOICES = {
  charlotte: 'XB0fDUnXU5powFXDhCwa',
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  daniel: 'onwK4e9ZLuTAKqWW03F9',
  charlie: 'IKne3meq5aSn9XLyUdCD',
  arnold: 'VR6AewLTigWG4xSOukaG',
}

// Aida klidná a profesionální, volající přirozený a trochu spěchá. Tóny ukázek hlasů.
const SETTINGS = {
  aida: { stability: 0.6, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true, speed: 0.97 },
  caller: { stability: 0.35, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true, speed: 1.08 },
  formal: { stability: 0.7, similarity_boost: 0.8, style: 0.05, use_speaker_boost: true, speed: 0.96 },
  friendly: { stability: 0.4, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true, speed: 1.04 },
}

const GAP_TURN = 0.45 // pauza mezi replikami (s)
const SAMPLE_RATE = 44100

// ───────── Čísla a časy: hlas je čte slovy, titulky ukazují číslice ─────────
const CS_NUM = ['nula', 'jedna', 'dvě', 'tři', 'čtyři', 'pět', 'šest', 'sedm', 'osm', 'devět', 'deset', 'jedenáct', 'dvanáct', 'třináct', 'čtrnáct', 'patnáct', 'šestnáct', 'sedmnáct', 'osmnáct', 'devatenáct', 'dvacet', 'dvacet jedna', 'dvacet dva', 'dvacet tři']
const CS_MIN = { '00': null, 15: 'patnáct', 30: 'třicet', 45: 'čtyřicet pět' }
/** Slovo titulků → jak ho přečte hlas (jen co je potřeba změnit). */
function spoken(word, lang) {
  // anglický hlas čte „Aida“ jako „Ada“; titulky zůstávají „Aida“
  if (lang === 'en') return word.replace(/^Aida(?=[.,!?’']|$)/, 'Ah-eeda')
  if (lang !== 'cs') return word
  const m = word.match(/^(\d{1,2}):(\d{2})([.,!?]*)$/)
  if (!m) return word
  const [, h, min, punct] = m
  const minutes = CS_MIN[min]
  if (minutes === undefined) throw new Error(`Neznámé minuty v čase ${word}`)
  return `${CS_NUM[Number(h)]} ${minutes ?? 'hodin'}${punct}`
}

// ───────── ElevenLabs ─────────
let credits = 0
let requests = 0
let cached = 0

async function tts({ voice, text, settings }) {
  const body = { text, model_id: MODEL, voice_settings: settings }
  const hash = createHash('sha256').update(JSON.stringify({ voice, body })).digest('hex').slice(0, 24)
  const file = path.join(CACHE, `${hash}.json`)
  if (!FORCE && existsSync(file)) {
    cached++
    return JSON.parse(readFileSync(file, 'utf8'))
  }
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    }).catch((err) => {
      if (attempt >= 3) throw err
      return null // vypršel čas: zkusit znovu
    })
    if (!res) continue
    if (res.ok) {
      const cost = Number(res.headers.get('character-cost') ?? res.headers.get('x-character-count') ?? text.length)
      credits += cost
      requests++
      const json = { ...(await res.json()), cost }
      mkdirSync(CACHE, { recursive: true })
      writeFileSync(file, JSON.stringify(json))
      return json
    }
    if (attempt >= 3 || (res.status !== 429 && res.status < 500)) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`)
    await new Promise((r) => setTimeout(r, 2000 * attempt))
  }
}

// ───────── Zvuk ─────────
/** MP3 z ElevenLabs → mono float32 PCM, hlasitost srovnaná na -18 LUFS (Aida i volající stejně hlasití). */
function decode(base64) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', 'pipe:1'], {
    input: Buffer.from(base64, 'base64'),
    maxBuffer: 1 << 28,
  })
  if (r.status !== 0) throw new Error(`ffmpeg decode: ${r.stderr}`)
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4)
}

/** Celá nahrávka do AAC (.m4a, moov na začátku) a MP3: jeden soubor, přehrávač zná délku z metadat. */
function encode(pcm, base) {
  const input = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  const common = ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SAMPLE_RATE), '-ac', '1', '-i', 'pipe:0']
  for (const [ext, codec] of [
    ['m4a', ['-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart']],
    ['mp3', ['-c:a', 'libmp3lame', '-b:a', '64k']],
  ]) {
    const r = spawnSync('ffmpeg', [...common, ...codec, `${base}.${ext}`], { input, maxBuffer: 1 << 28 })
    if (r.status !== 0) throw new Error(`ffmpeg encode ${ext}: ${r.stderr}`)
  }
}

/** Časy slov z časování znaků (slovo = od prvního do posledního znaku, bez interpunkce na okrajích). */
function wordTimes(alignment, ranges, offset) {
  const starts = alignment.character_start_times_seconds
  const ends = alignment.character_end_times_seconds
  return ranges.map(({ w, from, to }) => {
    let a = from
    let b = to - 1
    while (a < b && /[\s„“"'’.,!?:;()…-]/.test(alignment.characters[a])) a++
    while (b > a && /[\s„“"'’.,!?:;()…-]/.test(alignment.characters[b])) b--
    return { w, s: +(offset + starts[a]).toFixed(3), e: +(offset + ends[b]).toFixed(3) }
  })
}

const messages = (lang) => JSON.parse(readFileSync(path.join(ROOT, 'messages', `${lang}.json`), 'utf8')).marketing

async function demo(lang) {
  const scripts = messages(lang).demo.scripts
  const out = path.join(ROOT, 'public/audio/demo', lang)
  mkdirSync(out, { recursive: true })
  for (const [industry, lines] of Object.entries(scripts)) {
    const pieces = []
    for (const line of lines) {
      // text pro hlas + rozsahy znaků každého slova titulků v něm
      const ranges = []
      let ttsText = ''
      for (const w of line.t.split(/\s+/)) {
        if (ttsText) ttsText += ' '
        const s = spoken(w, lang)
        ranges.push({ w, from: ttsText.length, to: ttsText.length + s.length })
        ttsText += s
      }
      const speaker = line.s
      const res = await tts({ voice: speaker === 'aida' ? AIDA : CALLERS[industry], text: ttsText, settings: SETTINGS[speaker] })
      pieces.push({ speaker, text: line.t, ranges, res, pcm: decode(res.audio_base64) })
    }
    // slepit: krátké ticho na začátku, pauzy mezi replikami
    const gap = Math.round(GAP_TURN * SAMPLE_RATE)
    const lead = Math.round(0.25 * SAMPLE_RATE)
    const total = lead + pieces.reduce((n, p) => n + p.pcm.length, 0) + gap * (pieces.length - 1) + Math.round(0.3 * SAMPLE_RATE)
    const pcm = new Float32Array(total)
    let pos = lead
    const segments = []
    for (const p of pieces) {
      pcm.set(p.pcm, pos)
      const offset = pos / SAMPLE_RATE
      const words = wordTimes(p.res.alignment, p.ranges, offset)
      segments.push({ speaker: p.speaker, start: words[0].s, end: words.at(-1).e, text: p.text, words })
      pos += p.pcm.length + gap
    }
    encode(pcm, path.join(out, industry))
    const duration = +(total / SAMPLE_RATE).toFixed(2)
    writeFileSync(path.join(out, `${industry}.json`), JSON.stringify({ lang, duration, segments }, null, 2) + '\n')
    console.log(`demo ${lang}/${industry}: ${duration} s, ${segments.length} replik`)
  }
}

async function voice(lang) {
  const sample = messages(lang).voice.sample
  const out = path.join(ROOT, 'public/audio/voice', lang)
  mkdirSync(out, { recursive: true })
  rmSync(path.join(out, 'manifest.json'), { force: true }) // skutečné nahrávky, ne zástupné
  for (const [key, id] of Object.entries(VOICES)) {
    for (const tone of ['formal', 'friendly']) {
      const text = sample[tone]
        .replace('{name}', 'Aida')
        .split(' ')
        .map((w) => spoken(w, lang))
        .join(' ')
      const res = await tts({ voice: id, text, settings: SETTINGS[tone] })
      const pcm = decode(res.audio_base64)
      const padded = new Float32Array(pcm.length + Math.round(0.15 * SAMPLE_RATE))
      padded.set(pcm, Math.round(0.1 * SAMPLE_RATE))
      encode(padded, path.join(out, `${key}-${tone}`))
    }
    console.log(`voice ${lang}/${key}: formal, friendly`)
  }
}

for (const lang of LANGS) {
  if (ONLY !== 'voice') await demo(lang)
  if (ONLY !== 'demo') await voice(lang)
}
console.log(`\nElevenLabs: ${requests} nových požadavků, ${cached} z cache, spotřeba ${credits} kreditů (znaků).`)
