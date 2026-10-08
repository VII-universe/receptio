import { SUBPROCESSORS, type LegalDoc } from './types'
import type { LegalInfo } from '@/lib/legal'

export const termsCs = (l: LegalInfo): LegalDoc => ({
  title: 'Podmínky služby',
  intro: `Tyto podmínky upravují používání služby Receptio, kterou provozuje ${l.name}, IČO ${l.companyId}, se sídlem ${l.address} (dále „poskytovatel“). Služba je určena podnikatelům a organizacím, nikoli spotřebitelům.`,
  sections: [
    {
      heading: '1. Služba',
      paragraphs: [
        'Receptio je webová aplikace, která pomocí AI asistenta přijímá telefonní hovory za zákazníka, odpovídá na dotazy podle jeho nastavení a znalostní báze, zaznamenává požadavky a posílá shrnutí hovorů.',
        'Odpovědi asistenta generuje umělá inteligence. Mohou být nepřesné nebo neúplné. Zákazník odpovídá za obsah, který asistentovi nastaví (prompt, znalostní báze, pracovní doba), a za to, že jsou tyto informace správné.',
        'Služba není určena pro tísňová volání ani pro situace, kdy by nepřijatý nebo chybně obsloužený hovor mohl ohrozit život či zdraví.',
      ],
    },
    {
      heading: '2. Účet a zkušební doba',
      paragraphs: [
        'Pro používání služby je nutná registrace. Zákazník odpovídá za pravdivost údajů, zabezpečení přístupu a jednání osob, kterým zpřístupnil svůj workspace.',
        'Nový účet může využít bezplatnou zkušební dobu bez zadání platební karty v rozsahu uvedeném v aplikaci. Po jejím skončení je k pokračování nutné zvolit placený plán.',
      ],
    },
    {
      heading: '3. Ceny, platby a přečerpání',
      paragraphs: [
        'Ceny a rozsah plánů (počet minut, agentů, čísel a členů týmu) jsou uvedeny v ceníku a v aplikaci. Předplatné se účtuje měsíčně předem prostřednictvím služby Stripe a automaticky se obnovuje, dokud ho zákazník nezruší.',
        'Minuty nad rozsah plánu mohou být zpoplatněny podle aktuálního ceníku, pokud je to u daného plánu uvedeno; jinak mohou být hovory po vyčerpání limitu pozastaveny.',
        'Předplatné lze zrušit kdykoli v aplikaci; zrušení se projeví ke konci zaplaceného období. Již zaplacené částky se nevracejí, pokud zákon nestanoví jinak.',
      ],
    },
    {
      heading: '4. Povinnosti zákazníka',
      paragraphs: ['Zákazník je při používání služby povinen zejména:'],
      items: [
        'informovat volající, že hovor obsluhuje AI, a že může být nahráván a přepisován; služba toto oznámení ve výchozím nastavení přehrává na začátku hovoru a jeho vypnutí je na odpovědnosti zákazníka,',
        'mít pro nahrávání hovorů a zpracování osobních údajů volajících zákonný důvod a splnit informační povinnosti podle GDPR a dalších předpisů (včetně případných pravidel pro nahrávání hovorů ve státě volajícího),',
        'nepoužívat službu k nezákonným, klamavým nebo obtěžujícím účelům, k vydávání asistenta za člověka ani k obcházení bezpečnostních opatření,',
        'nezahrnovat do promptů a znalostní báze zvláštní kategorie osobních údajů ani citlivé údaje, které služba nepotřebuje.',
      ],
    },
    {
      heading: '5. Zpracování osobních údajů',
      paragraphs: [
        'U osobních údajů volajících, které zákazník prostřednictvím služby zpracovává, je zákazník správcem a poskytovatel zpracovatelem podle čl. 28 GDPR. Tato část tvoří smlouvu o zpracování osobních údajů.',
        'Předmětem je poskytování služby po dobu trvání smluvního vztahu; povaha zpracování: příjem a vedení hovorů, nahrávání, přepis, shrnutí a uložení; kategorie subjektů: volající a kontaktní osoby zákazníka; kategorie údajů: telefonní číslo, hlas, obsah hovoru a údaje, které volající sdělí.',
        'Poskytovatel zpracovává údaje jen podle dokumentovaných pokynů zákazníka (nastavení služby a tyto podmínky), zajišťuje mlčenlivost osob oprávněných údaje zpracovávat, přijímá přiměřená technická a organizační opatření, pomáhá zákazníkovi s žádostmi subjektů údajů a s plněním povinností podle GDPR a po ukončení služby údaje vymaže nebo vrátí podle volby zákazníka, pokud právo nevyžaduje jejich uchování.',
        'Zákazník dává obecné povolení k využití dalších zpracovatelů, kterými jsou v době vydání těchto podmínek:',
      ],
      items: SUBPROCESSORS.map((s) => `${s.name}: ${s.cs}`),
      after: [
        'O zamýšlené změně zpracovatelů poskytovatel zákazníka předem informuje; zákazník může změně z odůvodněných důvodů vznést námitku. Poskytovatel umožní kontrolu plnění povinností v přiměřeném rozsahu na žádost zákazníka.',
      ],
    },
    {
      heading: '6. Dostupnost a odpovědnost',
      paragraphs: [
        'Poskytovatel vyvíjí přiměřené úsilí o nepřetržitý provoz, ale nezaručuje, že služba bude bez přerušení a chyb; služba závisí i na třetích stranách (telekomunikační operátoři, poskytovatelé AI).',
        'Poskytovatel neodpovídá za nepřímé škody ani ušlý zisk, za obsah hovorů a odpovědi AI ani za jednání zákazníka vůči jeho volajícím. Celková odpovědnost poskytovatele je v rozsahu, který zákon dovoluje, omezena na částku zaplacenou zákazníkem za posledních 12 měsíců. Omezení se neuplatní tam, kde ho zákon vylučuje (např. škoda způsobená úmyslně).',
      ],
    },
    {
      heading: '7. Ukončení',
      paragraphs: [
        'Zákazník může účet kdykoli zrušit. Poskytovatel může přístup omezit nebo ukončit při závažném porušení podmínek (zejména zneužití služby nebo neplacení), případně s přiměřeným předstihem i bez uvedení důvodu. Po ukončení se údaje vymažou postupem uvedeným v zásadách ochrany osobních údajů.',
      ],
    },
    {
      heading: '8. Změny podmínek a rozhodné právo',
      paragraphs: [
        'Podmínky můžeme změnit; o podstatných změnách zákazníka informujeme předem v aplikaci nebo e-mailem. Pokračováním v používání služby po účinnosti změny zákazník změnu přijímá.',
        'Vztah se řídí právem České republiky. Spory rozhodují věcně příslušné soudy České republiky, místně soud podle sídla poskytovatele.',
        `Kontakt: ${l.email}.`,
      ],
    },
  ],
})

export const termsEn = (l: LegalInfo): LegalDoc => ({
  title: 'Terms of Service',
  intro: `These terms govern the use of the Receptio service operated by ${l.name}, company ID ${l.companyId}, registered office ${l.address} (the “provider”). The service is intended for businesses and organizations, not for consumers.`,
  sections: [
    {
      heading: '1. The service',
      paragraphs: [
        'Receptio is a web application that uses an AI assistant to answer phone calls on the customer’s behalf, answer questions based on the customer’s settings and knowledge base, record requests and send call summaries.',
        'The assistant’s replies are generated by artificial intelligence and may be inaccurate or incomplete. The customer is responsible for the content it configures for the assistant (prompt, knowledge base, business hours) and for its accuracy.',
        'The service is not intended for emergency calls or for situations where a missed or mishandled call could endanger life or health.',
      ],
    },
    {
      heading: '2. Account and trial',
      paragraphs: [
        'Registration is required. The customer is responsible for the accuracy of its data, for securing access, and for the actions of people to whom it gives access to its workspace.',
        'A new account can use a free trial without entering a payment card, within the scope shown in the app. After it ends, a paid plan is required to continue.',
      ],
    },
    {
      heading: '3. Prices, payment and overage',
      paragraphs: [
        'Prices and plan scope (minutes, agents, numbers and team members) are shown on the pricing page and in the app. Subscriptions are billed monthly in advance through Stripe and renew automatically until cancelled by the customer.',
        'Minutes beyond the plan may be charged at the current price list where the plan states so; otherwise calls may be paused when the limit is reached.',
        'A subscription can be cancelled at any time in the app; cancellation takes effect at the end of the paid period. Amounts already paid are not refunded unless the law requires otherwise.',
      ],
    },
    {
      heading: '4. Customer obligations',
      paragraphs: ['In using the service the customer must in particular:'],
      items: [
        'inform callers that the call is handled by AI and may be recorded and transcribed; by default the service plays this notice at the start of the call, and turning it off is the customer’s responsibility,',
        'have a lawful basis for recording calls and processing callers’ personal data and meet the information duties under the GDPR and other rules (including any call-recording rules in the caller’s country),',
        'not use the service for unlawful, deceptive or harassing purposes, to pass the assistant off as a human, or to circumvent security measures,',
        'not include special categories of personal data or sensitive data that the service does not need in prompts and the knowledge base.',
      ],
    },
    {
      heading: '5. Processing of personal data',
      paragraphs: [
        'For the personal data of callers that the customer processes through the service, the customer is the controller and the provider is the processor under Art. 28 GDPR. This section forms the data processing agreement.',
        'Subject matter: providing the service for the duration of the contract; nature of processing: receiving and conducting calls, recording, transcription, summarization and storage; data subjects: callers and the customer’s contacts; data categories: phone number, voice, call content and data the caller provides.',
        'The provider processes data only on the customer’s documented instructions (service settings and these terms), ensures confidentiality of authorized persons, applies appropriate technical and organizational measures, assists the customer with data subject requests and GDPR obligations, and on termination deletes or returns the data at the customer’s choice unless the law requires retention.',
        'The customer gives a general authorization to use further processors, which at the time of these terms are:',
      ],
      items: SUBPROCESSORS.map((s) => `${s.name}: ${s.en}`),
      after: [
        'The provider will inform the customer in advance of an intended change of processors; the customer may object on reasonable grounds. At the customer’s request the provider will allow a verification of compliance to a reasonable extent.',
      ],
    },
    {
      heading: '6. Availability and liability',
      paragraphs: [
        'The provider makes reasonable efforts to keep the service running continuously but does not guarantee it will be free of interruptions and errors; the service also depends on third parties (telecom carriers, AI providers).',
        'The provider is not liable for indirect damage or lost profit, for the content of calls and AI replies, or for the customer’s conduct towards its callers. To the extent the law allows, the provider’s total liability is limited to the amount the customer paid in the previous 12 months. The limitation does not apply where the law excludes it (for example damage caused intentionally).',
      ],
    },
    {
      heading: '7. Termination',
      paragraphs: [
        'The customer can close its account at any time. The provider may restrict or end access for serious breach of these terms (in particular abuse of the service or non-payment) or, with reasonable notice, without giving a reason. After termination data is deleted as described in the privacy policy.',
      ],
    },
    {
      heading: '8. Changes and governing law',
      paragraphs: [
        'We may change these terms; we will inform the customer of material changes in advance in the app or by email. By continuing to use the service after a change takes effect, the customer accepts it.',
        'The relationship is governed by the law of the Czech Republic. Disputes are decided by the competent courts of the Czech Republic, with local jurisdiction determined by the provider’s registered office.',
        `Contact: ${l.email}.`,
      ],
    },
  ],
})
