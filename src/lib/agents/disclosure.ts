// Oznámení volajícímu na začátku hovoru: mluví s AI a hovor může být nahráván a přepisován.
// Přidává se před úvodní pozdrav agenta (Vapi firstMessage); v DB zůstává pozdrav bez něj.

const DISCLOSURES: Record<string, string> = {
  cs: 'Dobrý den, hovoří s vámi AI asistent. Hovor může být nahráván a přepisován.',
  sk: 'Dobrý deň, hovoríte s AI asistentom. Hovor môže byť nahrávaný a prepisovaný.',
  en: 'Hello, you are speaking with an AI assistant. This call may be recorded and transcribed.',
  de: 'Guten Tag, Sie sprechen mit einem KI-Assistenten. Das Gespräch kann aufgezeichnet und transkribiert werden.',
  'de-AT': 'Grüß Gott, Sie sprechen mit einem KI-Assistenten. Das Gespräch kann aufgezeichnet und transkribiert werden.',
  pl: 'Dzień dobry, rozmawiają Państwo z asystentem AI. Rozmowa może być nagrywana i zapisywana w formie transkrypcji.',
  hu: 'Jó napot kívánok, egy mesterséges intelligencia asszisztenssel beszél. A hívás rögzítésre és átiratra kerülhet.',
  ro: 'Bună ziua, vorbiți cu un asistent AI. Apelul poate fi înregistrat și transcris.',
  fr: 'Bonjour, vous parlez avec un assistant IA. L’appel peut être enregistré et transcrit.',
  it: 'Buongiorno, sta parlando con un assistente IA. La chiamata può essere registrata e trascritta.',
  es: 'Buenos días, está hablando con un asistente de IA. La llamada puede ser grabada y transcrita.',
  nl: 'Goedendag, u spreekt met een AI-assistent. Het gesprek kan worden opgenomen en getranscribeerd.',
  sv: 'Hej, du pratar med en AI-assistent. Samtalet kan spelas in och transkriberas.',
  da: 'Goddag, du taler med en AI-assistent. Samtalen kan blive optaget og transskriberet.',
  pt: 'Olá, está a falar com um assistente de IA. A chamada pode ser gravada e transcrita.',
  el: 'Γεια σας, μιλάτε με έναν βοηθό τεχνητής νοημοσύνης. Η κλήση ενδέχεται να ηχογραφηθεί και να απομαγνητοφωνηθεί.',
  bg: 'Здравейте, разговаряте с AI асистент. Разговорът може да бъде записван и транскрибиран.',
  fi: 'Hei, puhut tekoälyavustajan kanssa. Puhelu voidaan tallentaa ja litteroida.',
  et: 'Tere, te räägite tehisintellekti assistendiga. Kõnet võidakse salvestada ja transkribeerida.',
  lv: 'Labdien, jūs runājat ar mākslīgā intelekta asistentu. Zvanu var ierakstīt un transkribēt.',
  lt: 'Laba diena, kalbate su dirbtinio intelekto asistentu. Pokalbis gali būti įrašomas ir transkribuojamas.',
  no: 'Hei, du snakker med en KI-assistent. Samtalen kan bli tatt opp og transkribert.',
  tr: 'Merhaba, bir yapay zekâ asistanıyla görüşüyorsunuz. Görüşme kaydedilebilir ve yazıya dökülebilir.',
}

export const disclosureFor = (language: string) => DISCLOSURES[language] ?? DISCLOSURES.en

/** Pozdrav s oznámením na začátku (když je oznámení zapnuté). */
export function withDisclosure(language: string, greeting: string, enabled = true): string {
  const base = stripDisclosure(greeting)
  return enabled ? `${disclosureFor(language)} ${base}` : base
}

/** Odstraní oznámení z pozdravu načteného z Vapi (v libovolném jazyce, jazyk agenta se mohl změnit). */
export function stripDisclosure(greeting: string): string {
  for (const text of Object.values(DISCLOSURES)) {
    if (greeting.startsWith(`${text} `)) return greeting.slice(text.length + 1)
  }
  return greeting
}
