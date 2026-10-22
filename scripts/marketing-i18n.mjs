// Kontrola překladů veřejného webu (messages/<jazyk>.json → klíč "marketing"), viz docs/translations-review.md.
//   node scripts/marketing-i18n.mjs        zkontroluje klíče, proměnné a ICU syntax proti češtině
//   node scripts/marketing-i18n.mjs --fix  navíc doplní typografii (nezlomitelné mezery v cs/sk/pl, francouzské mezery)
// Mění jen blok "marketing"; ostatní namespace zůstanou v souborech beze změny.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { IntlMessageFormat } = require('intl-messageformat')

const DIR = path.join(process.cwd(), 'messages')
const FIX = process.argv.includes('--fix')
const SAMPLE = { count: 3, price: '4 Kč', plan: 'Starter', name: 'Aida', text: 'x', year: 2026, id: '1', starter: 1, business: 2, pro: 3, em: (c) => c }

const mapStrings = (v, fn) =>
  typeof v === 'string'
    ? fn(v)
    : Array.isArray(v)
      ? v.map((x) => mapStrings(x, fn))
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn)]))
        : v

// Jednopísmenné předložky a spojky nesmí zůstat na konci řádku.
const nbsp = (s) => s.replace(/(^|[\s(„])([vkszouaiwVKSZOUAIW]) /g, '$1$2 ').replace(/(^|[\s(„])([vkszouaiwVKSZOUAIW]) /g, '$1$2 ')
// Francouzština: úzká nezlomitelná mezera před ? ! : ; a uvnitř « ».
const frTypo = (s) => s.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ')
const TYPO = { cs: nbsp, sk: nbsp, pl: nbsp, fr: frTypo }

const leaves = (o, p = '') =>
  typeof o === 'string'
    ? [[p, o]]
    : Array.isArray(o)
      ? o.flatMap((x, i) => leaves(x, `${p}[${i}]`))
      : Object.entries(o).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k))
const shape = (o, p = '') =>
  Array.isArray(o) ? [`${p}[${o.length}]`] : o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => shape(v, p ? `${p}.${k}` : k)) : [p]
const vars = (s) => [...s.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort().join(',')
const tags = (s) => [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort().join(',')

/** Přepíše jen top-level blok "marketing" a ponechá zbytek souboru bajt po bajtu. */
function replaceBlock(text, key, value) {
  const lines = text.split('\n')
  const start = lines.findIndex((l) => l.startsWith(`  "${key}": `))
  if (start < 0) throw new Error(`missing "${key}"`)
  let end = lines.findIndex((l, i) => i > start && /^ {2}"[^"]+": /.test(l))
  if (end < 0) end = lines.lastIndexOf('}')
  const last = end === lines.lastIndexOf('}')
  const body = `  ${JSON.stringify(key)}: ${JSON.stringify(value, null, 2).replace(/\n/g, '\n  ')}${last ? '' : ','}`
  return [...lines.slice(0, start), ...body.split('\n'), ...lines.slice(end)].join('\n')
}

const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
const ref = read('cs.json').marketing
const refShape = new Set(shape(ref))
const refLeaves = new Map(leaves(ref))
let problems = 0
const report = (loc, msg) => {
  problems++
  console.log(`${loc}: ${msg}`)
}

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const loc = file.replace('.json', '')
  let m = read(file).marketing
  if (!m) {
    report(loc, 'chybí blok "marketing"')
    continue
  }
  const own = new Set(shape(m))
  for (const k of refShape) if (!own.has(k)) report(loc, `chybí nebo má jiný tvar: ${k}`)
  for (const k of own) if (!refShape.has(k)) report(loc, `navíc: ${k}`)
  for (const [p, s] of leaves(m)) {
    const r = refLeaves.get(p)
    if (r === undefined) continue
    if (vars(s) !== vars(r)) report(loc, `${p}: proměnné ${vars(s) || '-'} místo ${vars(r) || '-'}`)
    if (tags(s) !== tags(r)) report(loc, `${p}: tagy ${tags(s) || '-'} místo ${tags(r) || '-'}`)
    try {
      new IntlMessageFormat(s, loc).format(SAMPLE)
    } catch (e) {
      report(loc, `${p}: ${e.message}`)
    }
  }
  if (FIX && TYPO[loc]) {
    const fixed = mapStrings(m, TYPO[loc])
    if (JSON.stringify(fixed) !== JSON.stringify(m)) {
      const p = path.join(DIR, file)
      fs.writeFileSync(p, replaceBlock(fs.readFileSync(p, 'utf8'), 'marketing', fixed))
      console.log(`${loc}: typografie doplněna`)
    }
    m = fixed
  }
}

console.log(problems ? `\n${problems} problémů` : 'Překlady marketing: v pořádku')
process.exit(problems ? 1 : 0)
