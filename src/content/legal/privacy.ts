import type { LegalInfo } from '@/lib/legal'
import { SUBPROCESSORS, type LegalDoc } from './types'

export const privacyCs = (l: LegalInfo): LegalDoc => ({
  title: 'Zásady ochrany osobních údajů',
  intro:
    'Receptio je služba, která za vás přijímá telefonní hovory pomocí AI asistenta. Tyto zásady vysvětlují, jaké osobní údaje zpracováváme, proč, jak dlouho a jaká máte práva.',
  sections: [
    {
      heading: '1. Kdo osobní údaje zpracovává',
      paragraphs: [
        `Provozovatelem služby Receptio je ${l.name}, IČO ${l.companyId}, se sídlem ${l.address}${l.registry === '[●]' ? '' : `, ${l.registry}`} (dále „my“).`,
        `Kontakt pro záležitosti ochrany osobních údajů: ${l.email}.`,
        'Naše role se liší podle toho, o jaké údaje jde: u údajů o vašem účtu a platbách jsme správcem my; u údajů volajících, kteří telefonují vašemu podniku, je správcem váš podnik (zákazník Receptia) a my jsme jeho zpracovatelem podle čl. 28 GDPR (viz Podmínky služby, část o zpracování osobních údajů).',
      ],
    },
    {
      heading: '2. Jaké údaje zpracováváme',
      items: [
        'Údaje o účtu: jméno, e-mailová adresa, údaje o přihlášení (zajišťuje poskytovatel přihlášení Clerk).',
        'Údaje o vaší firmě a nastavení: název podniku, obor, časové pásmo, nastavení agentů, znalostní báze, pracovní doba, pravidla přesměrování, členové týmu.',
        'Platební údaje: o předplatném a fakturaci. Číslo platební karty nikdy neukládáme, zpracovává ho společnost Stripe.',
        'Údaje o hovorech: telefonní číslo volajícího, datum, čas a délka hovoru, nahrávka hovoru, přepis, shrnutí a náklady hovoru. Hlas volajícího a obsah hovoru mohou obsahovat osobní údaje, které volající sám sdělí.',
        'Technické údaje: IP adresa a záznamy o provozu nutné k zabezpečení a provozu služby.',
        'Cookies a místní úložiště prohlížeče: viz Zásady cookies.',
      ],
    },
    {
      heading: '3. Účely a právní základy',
      items: [
        'Poskytování služby a plnění smlouvy (čl. 6 odst. 1 písm. b GDPR): vytvoření účtu, provoz AI asistenta, doručování shrnutí hovorů, správa předplatného.',
        'Plnění právních povinností (čl. 6 odst. 1 písm. c): účetní a daňové doklady.',
        'Oprávněný zájem (čl. 6 odst. 1 písm. f): zabezpečení služby, prevence zneužití a podvodů, řešení sporů, nezbytná provozní komunikace.',
        'Souhlas (čl. 6 odst. 1 písm. a): ukládání preferencí v prohlížeči (jazyk, vzhled). Souhlas můžete kdykoli odvolat v Nastavení cookies.',
      ],
      after: ['Údaje o hovorech zpracováváme výhradně podle pokynů zákazníka, který hovory přijímá, a nepoužíváme je pro vlastní marketing.'],
    },
    {
      heading: '4. Hovory a umělá inteligence (informace pro volající)',
      paragraphs: [
        'Hovory na čísla používající Receptio přijímá AI asistent, nikoli člověk. Ve výchozím nastavení je volající na začátku hovoru informován o tom, že mluví s AI, a také o tom, že hovor může být nahráván a přepisován.',
        'Hovor se převádí na text, odpovědi formuluje jazykový model a vyslovuje je syntetický hlas. Asistent nepřijímá rozhodnutí s právními nebo obdobně závažnými účinky pro volajícího; může zaznamenat požadavek (např. rezervaci) a předat ho podniku nebo přepojit hovor na člověka, pokud to podnik nastavil.',
        'Správcem údajů z hovoru je podnik, kterému voláte. S žádostmi o přístup, výmaz nebo námitku se na něj můžete obrátit přímo; my mu pomůžeme požadavek vyřídit.',
      ],
    },
    {
      heading: '5. Komu údaje předáváme',
      paragraphs: ['K provozu služby využíváme tyto zpracovatele (subdodavatele). Každý smí údaje používat jen pro poskytování své služby nám:'],
      items: SUBPROCESSORS.map((s) => `${s.name}: ${s.cs}`),
      after: [
        'Údaje můžeme dále sdělit orgánům veřejné moci, pokud nám to ukládá zákon, a poradcům vázaným mlčenlivostí.',
        'Osobní údaje neprodáváme.',
      ],
    },
    {
      heading: '6. Předávání mimo EHP',
      paragraphs: [
        'Někteří zpracovatelé sídlí nebo zpracovávají údaje mimo Evropský hospodářský prostor (zejména ve Spojených státech). Takové předání se opírá o mechanismy podle kapitoly V GDPR, zejména o standardní smluvní doložky Evropské komise nebo o rozhodnutí o odpovídající ochraně. Aktuální seznam zpracovatelů a použitých mechanismů poskytneme na vyžádání.',
      ],
    },
    {
      heading: '7. Jak dlouho údaje uchováváme',
      items: [
        'Údaje o účtu a nastavení: po dobu trvání účtu; po jeho zrušení je odstraníme, pokud nám právní předpis neukládá je uchovat.',
        'Údaje o hovorech (nahrávky, přepisy, shrnutí): dokud je zákazník nesmaže; smazáním agenta se smaže i historie jeho hovorů. Lhůty uchovávání u subdodavatelů se řídí jejich podmínkami.',
        'Účetní a daňové doklady: po dobu stanovenou právními předpisy (u daňových dokladů obvykle až 10 let).',
        'Záznamy o provozu: po dobu nezbytnou pro zabezpečení a řešení incidentů.',
      ],
    },
    {
      heading: '8. Vaše práva',
      paragraphs: ['Podle GDPR máte právo na přístup k údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost a právo vznést námitku proti zpracování založenému na oprávněném zájmu. Souhlas můžete kdykoli odvolat, aniž by tím byla dotčena zákonnost zpracování před odvoláním.'],
      after: [
        `Požadavky nám pošlete na ${l.email}. Pokud se domníváte, že s údaji nakládáme v rozporu s právem, můžete podat stížnost u Úřadu pro ochranu osobních údajů (uoou.gov.cz) nebo jiného dozorového úřadu ve svém státě.`,
      ],
    },
    {
      heading: '9. Zabezpečení',
      paragraphs: [
        'Komunikace s aplikací je šifrovaná (HTTPS/TLS). Přístup k datům je omezen rolemi v rámci workspace a přístup k databázi je chráněn (vrstva přístupu je řízena serverem aplikace). Žádné zabezpečení však nelze zaručit absolutně; o případném porušení zabezpečení osobních údajů budeme informovat způsobem, který vyžaduje zákon.',
      ],
    },
    {
      heading: '10. Změny zásad',
      paragraphs: ['Zásady můžeme aktualizovat. Datum poslední aktualizace je uvedeno na této stránce; o podstatných změnách vás budeme informovat v aplikaci nebo e-mailem.'],
    },
  ],
})

export const privacyEn = (l: LegalInfo): LegalDoc => ({
  title: 'Privacy Policy',
  intro:
    'Receptio is a service that answers phone calls on your behalf with an AI assistant. This policy explains which personal data we process, why, for how long, and what rights you have.',
  sections: [
    {
      heading: '1. Who processes personal data',
      paragraphs: [
        `Receptio is operated by ${l.name}, company ID ${l.companyId}, registered office ${l.address}${l.registry === '[●]' ? '' : `, ${l.registry}`} (“we”).`,
        `Contact for personal data matters: ${l.email}.`,
        'Our role depends on the data: for your account and billing data we are the controller; for data of callers who phone your business, your business (the Receptio customer) is the controller and we act as its processor under Art. 28 GDPR (see the Terms of Service, section on personal data processing).',
      ],
    },
    {
      heading: '2. Data we process',
      items: [
        'Account data: name, email address, sign-in data (provided by our sign-in provider Clerk).',
        'Business and configuration data: business name, industry, time zone, agent settings, knowledge base, business hours, forwarding rules, team members.',
        'Billing data: subscription and invoicing information. We never store card numbers; Stripe processes them.',
        'Call data: the caller’s phone number, date, time and duration of the call, call recording, transcript, summary and call cost. The caller’s voice and the content of the call may contain personal data that the caller provides.',
        'Technical data: IP address and operational logs needed to secure and run the service.',
        'Cookies and browser local storage: see the Cookie Policy.',
      ],
    },
    {
      heading: '3. Purposes and legal bases',
      items: [
        'Providing the service and performing the contract (Art. 6(1)(b) GDPR): creating the account, running the AI assistant, delivering call summaries, managing the subscription.',
        'Legal obligations (Art. 6(1)(c)): accounting and tax records.',
        'Legitimate interests (Art. 6(1)(f)): securing the service, preventing abuse and fraud, handling disputes, necessary operational communication.',
        'Consent (Art. 6(1)(a)): storing preferences in your browser (language, appearance). You can withdraw consent at any time in Cookie settings.',
      ],
      after: ['We process call data solely on the instructions of the customer who receives the calls and do not use it for our own marketing.'],
    },
    {
      heading: '4. Calls and artificial intelligence (information for callers)',
      paragraphs: [
        'Calls to numbers that use Receptio are answered by an AI assistant, not a human. By default, at the start of the call the caller is told this, and also that the call may be recorded and transcribed.',
        'The call is converted to text, a language model formulates the replies and a synthetic voice speaks them. The assistant does not make decisions with legal or similarly significant effects on the caller; it may record a request (for example a reservation) and pass it to the business, or transfer the call to a person if the business has set this up.',
        'The controller of the call data is the business you are calling. You can contact it directly with requests for access, erasure or objection; we will help it handle the request.',
      ],
    },
    {
      heading: '5. Who receives data',
      paragraphs: ['To run the service we use the following processors (sub-processors). Each may use data only to provide its service to us:'],
      items: SUBPROCESSORS.map((s) => `${s.name}: ${s.en}`),
      after: [
        'We may further disclose data to public authorities where required by law and to advisers bound by confidentiality.',
        'We do not sell personal data.',
      ],
    },
    {
      heading: '6. Transfers outside the EEA',
      paragraphs: [
        'Some processors are located or process data outside the European Economic Area (notably in the United States). Such transfers rely on the mechanisms of Chapter V GDPR, in particular the European Commission’s standard contractual clauses or an adequacy decision. We will provide the current list of processors and the mechanisms used on request.',
      ],
    },
    {
      heading: '7. How long we keep data',
      items: [
        'Account and configuration data: for as long as the account exists; after it is closed we delete it unless the law requires us to keep it.',
        'Call data (recordings, transcripts, summaries): until the customer deletes it; deleting an agent also deletes its call history. Retention at sub-processors follows their terms.',
        'Accounting and tax records: for the period required by law (usually up to 10 years for tax documents).',
        'Operational logs: for as long as needed for security and incident handling.',
      ],
    },
    {
      heading: '8. Your rights',
      paragraphs: ['Under the GDPR you have the right of access, rectification, erasure, restriction of processing, data portability and the right to object to processing based on legitimate interests. You can withdraw consent at any time without affecting the lawfulness of processing before withdrawal.'],
      after: [
        `Send requests to ${l.email}. If you believe we handle data in breach of the law, you can lodge a complaint with the Czech Office for Personal Data Protection (uoou.gov.cz) or another supervisory authority in your country.`,
      ],
    },
    {
      heading: '9. Security',
      paragraphs: [
        'Communication with the app is encrypted (HTTPS/TLS). Access to data is limited by roles within the workspace and access to the database is protected (the access layer is controlled by the application server). No security can be guaranteed absolutely; we will report any personal data breach as required by law.',
      ],
    },
    {
      heading: '10. Changes to this policy',
      paragraphs: ['We may update this policy. The date of the last update is shown on this page; we will notify you of material changes in the app or by email.'],
    },
  ],
})
