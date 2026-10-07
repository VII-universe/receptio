// Jazyky agentů. Jsou tu jen jazyky, které podporuje přepis řeči (Deepgram nova-2): chorvatština,
// slovinština, maltština a irština v něm nejsou, takže by agent neporozuměl volajícímu.

export interface LanguageInfo {
  code: string // BCP-47 (de-AT = německy s rakouským pozdravem)
  name: string // název v daném jazyce (zobrazuje se v UI a ukládá do agents.language_name)
  flag: string
  deepgram: string // kód jazyka pro přepis řeči ve Vapi
  /** Pokyn pro jazyk na konci promptu, napsaný v cílovém jazyce. */
  instruction: string
  goodbye: string // endCallMessage
  endPhrases: string[] // fráze, které ukončí hovor
  greeting: (business: string) => string // obecný úvodní pozdrav (pro češtinu má onboarding vlastní šablony)
}

export const LANGUAGES: LanguageInfo[] = [
  {
    code: 'cs', name: 'Čeština', flag: '🇨🇿', deepgram: 'cs',
    instruction: 'Komunikuj výhradně v češtině. Nepřepínej do jiného jazyka, ani když volající mluví jinak. Pokud nerozumíš, požádej volajícího, aby to zopakoval v češtině.',
    goodbye: 'Nashledanou, hezký den.', endPhrases: ['nashledanou', 'na shledanou', 'sbohem'],
    greeting: (b) => `Dobrý den, ${b}, jak vám mohu pomoci?`,
  },
  {
    code: 'sk', name: 'Slovenčina', flag: '🇸🇰', deepgram: 'sk',
    instruction: 'Komunikuj výlučne po slovensky. Neprepínaj do iného jazyka, ani keď volajúci hovorí inak. Ak niečomu nerozumieš, požiadaj volajúceho, aby to zopakoval po slovensky.',
    goodbye: 'Dovidenia, pekný deň.', endPhrases: ['dovidenia', 'do videnia', 'zbohom'],
    greeting: (b) => `Dobrý deň, ${b}, ako vám môžem pomôcť?`,
  },
  {
    code: 'en', name: 'English', flag: '🇬🇧', deepgram: 'en',
    instruction: "You MUST respond exclusively in English. Do not switch languages even if the caller speaks a different language. If you don't understand, ask the caller to repeat in English.",
    goodbye: 'Goodbye, have a nice day.', endPhrases: ['goodbye', 'bye', 'good bye'],
    greeting: (b) => `Hello, thank you for calling ${b}. How can I help you?`,
  },
  {
    code: 'de', name: 'Deutsch', flag: '🇩🇪', deepgram: 'de',
    instruction: 'Du MUSST ausschließlich auf Deutsch antworten. Wechsle nicht die Sprache, auch wenn der Anrufer eine andere Sprache spricht. Wenn du etwas nicht verstehst, bitte den Anrufer, es auf Deutsch zu wiederholen.',
    goodbye: 'Auf Wiedersehen, einen schönen Tag.', endPhrases: ['auf wiedersehen', 'tschüss', 'wiederhören'],
    greeting: (b) => `Guten Tag, ${b}, wie kann ich Ihnen helfen?`,
  },
  {
    code: 'de-AT', name: 'Österreichisches Deutsch', flag: '🇦🇹', deepgram: 'de',
    instruction: 'Du MUSST ausschließlich auf Deutsch (österreichische Sprachvariante, z. B. „Grüß Gott“) antworten. Wechsle nicht die Sprache, auch wenn der Anrufer eine andere Sprache spricht. Wenn du etwas nicht verstehst, bitte den Anrufer, es auf Deutsch zu wiederholen.',
    goodbye: 'Auf Wiederschauen, einen schönen Tag.', endPhrases: ['auf wiederschauen', 'auf wiedersehen', 'servus'],
    greeting: (b) => `Grüß Gott, ${b}, wie kann ich Ihnen helfen?`,
  },
  {
    code: 'pl', name: 'Polski', flag: '🇵🇱', deepgram: 'pl',
    instruction: 'MUSISZ odpowiadać wyłącznie po polsku. Nie zmieniaj języka, nawet jeśli dzwoniący mówi w innym języku. Jeśli czegoś nie rozumiesz, poproś dzwoniącego o powtórzenie po polsku.',
    goodbye: 'Do widzenia, miłego dnia.', endPhrases: ['do widzenia', 'żegnam', 'pa pa'],
    greeting: (b) => `Dzień dobry, ${b}, w czym mogę pomóc?`,
  },
  {
    code: 'hu', name: 'Magyar', flag: '🇭🇺', deepgram: 'hu',
    instruction: 'KÖTELEZŐ kizárólag magyarul válaszolnod. Ne válts nyelvet, akkor sem, ha a hívó másik nyelven beszél. Ha valamit nem értesz, kérd meg a hívót, hogy ismételje meg magyarul.',
    goodbye: 'Viszontlátásra, további szép napot.', endPhrases: ['viszontlátásra', 'viszlát', 'szia'],
    greeting: (b) => `Jó napot kívánok, ${b}, miben segíthetek?`,
  },
  {
    code: 'ro', name: 'Română', flag: '🇷🇴', deepgram: 'ro',
    instruction: 'TREBUIE să răspunzi exclusiv în limba română. Nu schimba limba, chiar dacă apelantul vorbește altă limbă. Dacă nu înțelegi, roagă apelantul să repete în limba română.',
    goodbye: 'La revedere, o zi bună.', endPhrases: ['la revedere', 'o zi bună', 'pa'],
    greeting: (b) => `Bună ziua, ${b}, cu ce vă pot ajuta?`,
  },
  {
    code: 'fr', name: 'Français', flag: '🇫🇷', deepgram: 'fr',
    instruction: "Tu DOIS répondre exclusivement en français. Ne change pas de langue, même si l'appelant parle une autre langue. Si tu ne comprends pas, demande à l'appelant de répéter en français.",
    goodbye: 'Au revoir, bonne journée.', endPhrases: ['au revoir', 'bonne journée', 'salut'],
    greeting: (b) => `Bonjour, ${b}, comment puis-je vous aider ?`,
  },
  {
    code: 'it', name: 'Italiano', flag: '🇮🇹', deepgram: 'it',
    instruction: "DEVI rispondere esclusivamente in italiano. Non cambiare lingua, anche se chi chiama parla un'altra lingua. Se non capisci, chiedi al chiamante di ripetere in italiano.",
    goodbye: 'Arrivederci, buona giornata.', endPhrases: ['arrivederci', 'buona giornata', 'ciao'],
    greeting: (b) => `Buongiorno, ${b}, come posso aiutarla?`,
  },
  {
    code: 'es', name: 'Español', flag: '🇪🇸', deepgram: 'es',
    instruction: 'DEBES responder exclusivamente en español. No cambies de idioma, aunque quien llama hable otro idioma. Si no entiendes, pide a la persona que llama que lo repita en español.',
    goodbye: 'Adiós, que tenga un buen día.', endPhrases: ['adiós', 'adios', 'hasta luego'],
    greeting: (b) => `Buenos días, ${b}, ¿en qué puedo ayudarle?`,
  },
  {
    code: 'nl', name: 'Nederlands', flag: '🇳🇱', deepgram: 'nl',
    instruction: 'Je MOET uitsluitend in het Nederlands antwoorden. Wissel niet van taal, ook niet als de beller een andere taal spreekt. Als je iets niet begrijpt, vraag de beller het in het Nederlands te herhalen.',
    goodbye: 'Tot ziens, een fijne dag.', endPhrases: ['tot ziens', 'doei', 'dag'],
    greeting: (b) => `Goedendag, ${b}, waarmee kan ik u helpen?`,
  },
  {
    code: 'sv', name: 'Svenska', flag: '🇸🇪', deepgram: 'sv',
    instruction: 'Du MÅSTE svara uteslutande på svenska. Byt inte språk, även om den som ringer talar ett annat språk. Om du inte förstår, be den som ringer att upprepa på svenska.',
    goodbye: 'Hej då, ha en bra dag.', endPhrases: ['hej då', 'hejdå', 'adjö'],
    greeting: (b) => `Hej, ${b}, hur kan jag hjälpa dig?`,
  },
  {
    code: 'da', name: 'Dansk', flag: '🇩🇰', deepgram: 'da',
    instruction: 'Du SKAL svare udelukkende på dansk. Skift ikke sprog, selv hvis den, der ringer, taler et andet sprog. Hvis du ikke forstår, så bed den, der ringer, om at gentage det på dansk.',
    goodbye: 'Farvel, hav en god dag.', endPhrases: ['farvel', 'hej hej', 'på gensyn'],
    greeting: (b) => `Goddag, ${b}, hvordan kan jeg hjælpe dig?`,
  },
  {
    code: 'pt', name: 'Português', flag: '🇵🇹', deepgram: 'pt',
    instruction: 'Deves responder exclusivamente em português. Não mudes de idioma, mesmo que quem liga fale outra língua. Se não perceberes, pede a quem liga que repita em português.',
    goodbye: 'Até logo, tenha um bom dia.', endPhrases: ['até logo', 'adeus', 'tchau'],
    greeting: (b) => `Bom dia, ${b}, em que posso ajudar?`,
  },
  {
    code: 'el', name: 'Ελληνικά', flag: '🇬🇷', deepgram: 'el',
    instruction: 'Πρέπει να απαντάς αποκλειστικά στα ελληνικά. Μην αλλάζεις γλώσσα, ακόμη κι αν ο καλών μιλά άλλη γλώσσα. Αν δεν καταλαβαίνεις, ζήτα από τον καλούντα να επαναλάβει στα ελληνικά.',
    goodbye: 'Αντίο, καλή συνέχεια.', endPhrases: ['αντίο', 'γεια σας', 'αντίο σας'],
    greeting: (b) => `Καλημέρα, ${b}, πώς μπορώ να σας βοηθήσω;`,
  },
  {
    code: 'bg', name: 'Български', flag: '🇧🇬', deepgram: 'bg',
    instruction: 'ТРЯБВА да отговаряш изключително на български. Не сменяй езика, дори и когато обаждащият се говори на друг език. Ако не разбираш, помоли обаждащия се да повтори на български.',
    goodbye: 'Довиждане, приятен ден.', endPhrases: ['довиждане', 'чао', 'приятен ден'],
    greeting: (b) => `Добър ден, ${b}, с какво мога да ви помогна?`,
  },
  {
    code: 'fi', name: 'Suomi', flag: '🇫🇮', deepgram: 'fi',
    instruction: 'Sinun TÄYTYY vastata yksinomaan suomeksi. Älä vaihda kieltä, vaikka soittaja puhuisi toista kieltä. Jos et ymmärrä, pyydä soittajaa toistamaan asia suomeksi.',
    goodbye: 'Hyvää päivänjatkoa, näkemiin.', endPhrases: ['näkemiin', 'hei hei', 'moi moi'],
    greeting: (b) => `Hyvää päivää, ${b}, miten voin auttaa?`,
  },
  {
    code: 'et', name: 'Eesti', flag: '🇪🇪', deepgram: 'et',
    instruction: 'Sa PEAD vastama eranditult eesti keeles. Ära vaheta keelt, isegi kui helistaja räägib teist keelt. Kui sa millestki aru ei saa, palu helistajal seda eesti keeles korrata.',
    goodbye: 'Head aega, ilusat päeva.', endPhrases: ['head aega', 'nägemist', 'tšau'],
    greeting: (b) => `Tere, ${b}, kuidas ma saan aidata?`,
  },
  {
    code: 'lv', name: 'Latviešu', flag: '🇱🇻', deepgram: 'lv',
    instruction: 'Tev JĀATBILD tikai latviešu valodā. Nemaini valodu, pat ja zvanītājs runā citā valodā. Ja kaut ko nesaproti, palūdz zvanītājam atkārtot latviešu valodā.',
    goodbye: 'Uz redzēšanos, jauku dienu.', endPhrases: ['uz redzēšanos', 'atā', 'visu labu'],
    greeting: (b) => `Labdien, ${b}, kā es varu palīdzēt?`,
  },
  {
    code: 'lt', name: 'Lietuvių', flag: '🇱🇹', deepgram: 'lt',
    instruction: 'Privalai atsakyti tik lietuvių kalba. Nekeisk kalbos, net jei skambinantysis kalba kita kalba. Jei ko nors nesupranti, paprašyk skambinančiojo pakartoti lietuvių kalba.',
    goodbye: 'Viso gero, geros dienos.', endPhrases: ['viso gero', 'iki', 'viso labo'],
    greeting: (b) => `Laba diena, ${b}, kuo galiu padėti?`,
  },
]

export const DEFAULT_LANGUAGE = 'cs'

const byCode = new Map(LANGUAGES.map((l) => [l.code, l]))

export const isLanguageCode = (v: unknown): v is string => typeof v === 'string' && byCode.has(v)

/** Neznámý kód (např. starý záznam) spadne na češtinu, aby se nic nerozbilo. */
export const getLanguage = (code: string | null | undefined): LanguageInfo =>
  byCode.get(code ?? '') ?? byCode.get(DEFAULT_LANGUAGE)!

/** "🇩🇪 Deutsch" – hodnota do výběru jazyka. */
export const languageLabel = (l: LanguageInfo) => `${l.flag} ${l.name}`
