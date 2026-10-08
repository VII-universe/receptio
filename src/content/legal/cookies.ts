import type { LegalDoc } from './types'

export const cookiesCs = (): LegalDoc => ({
  title: 'Zásady cookies',
  intro:
    'Receptio používá jen nezbytné cookies a, pokud je povolíte, cookies s vašimi preferencemi. Nepoužíváme reklamní, sledovací ani analytické cookies třetích stran.',
  sections: [
    {
      heading: 'Nezbytné (bez souhlasu)',
      paragraphs: ['Nutné pro přihlášení, zabezpečení a fungování služby. Nelze je vypnout.'],
      items: [
        'receptio_consent (cookie, 180 dní): pamatuje si vaši volbu v tomto banneru.',
        'Cookies poskytovatele přihlášení Clerk (např. __session, __client_uptime, __refresh_*, clerk_active_context; relace nebo do odhlášení): udržují přihlášení a chrání před zneužitím. Nastavují se při přihlášení nebo registraci.',
      ],
    },
    {
      heading: 'Preference (jen se souhlasem)',
      paragraphs: ['Ukládají se, jen pokud je povolíte v banneru nebo v Nastavení cookies. Po odvolání souhlasu je smažeme.'],
      items: [
        'locale (cookie, 1 rok): jazyk marketingových stránek, aby registrace pokračovala ve stejném jazyce.',
        'receptio-theme (místní úložiště prohlížeče): vámi zvolený vzhled aplikace (světlý/tmavý režim a barva).',
      ],
    },
    {
      heading: 'Pohodlí na vaši žádost',
      paragraphs: ['Ukládá se jen na základě vaší výslovné akce, nejde o sledování:'],
      items: [
        'receptio_test_phone (místní úložiště): telefonní číslo pro testovací hovor, jen pokud zaškrtnete „Zapamatovat číslo“.',
        'receptio_trial_banner_dismissed (místní úložiště): skrytí upozornění na zkušební dobu, které jste zavřeli.',
        'onboarding_step_<id uživatele> (místní úložiště): krok průvodce prvním nastavením, abyste po zavření okna pokračovali tam, kde jste skončili.',
      ],
    },
    {
      heading: 'Služby třetích stran',
      paragraphs: [
        'Při platbě jste přesměrováni na stránky Stripe, které používají vlastní cookies podle svých zásad. Na našich stránkách neintegrujeme reklamní ani analytické nástroje třetích stran.',
      ],
    },
    {
      heading: 'Jak souhlas změnit',
      paragraphs: [
        'Svou volbu můžete kdykoli změnit nebo odvolat přes odkaz „Nastavení cookies“ v patičce stránky. Cookies lze také smazat v nastavení prohlížeče; nezbytné cookies jsou pak při další návštěvě nastaveny znovu.',
      ],
    },
  ],
})

export const cookiesEn = (): LegalDoc => ({
  title: 'Cookie Policy',
  intro:
    'Receptio uses only necessary cookies and, if you allow them, cookies holding your preferences. We do not use advertising, tracking or third-party analytics cookies.',
  sections: [
    {
      heading: 'Necessary (no consent required)',
      paragraphs: ['Required for signing in, security and running the service. They cannot be turned off.'],
      items: [
        'receptio_consent (cookie, 180 days): remembers your choice in this banner.',
        'Cookies of our sign-in provider Clerk (for example __session, __client_uptime, __refresh_*, clerk_active_context; session or until sign-out): keep you signed in and protect against abuse. They are set when you sign in or register.',
      ],
    },
    {
      heading: 'Preferences (only with consent)',
      paragraphs: ['Stored only if you allow them in the banner or in Cookie settings. We delete them if you withdraw consent.'],
      items: [
        'locale (cookie, 1 year): the language of the marketing pages so that registration continues in the same language.',
        'receptio-theme (browser local storage): the app appearance you chose (light/dark mode and colour).',
      ],
    },
    {
      heading: 'Convenience at your request',
      paragraphs: ['Stored only because of your explicit action; this is not tracking:'],
      items: [
        'receptio_test_phone (local storage): the phone number for a test call, only if you tick “Remember the number”.',
        'receptio_trial_banner_dismissed (local storage): hides the trial notice you closed.',
        'onboarding_step_<user id> (local storage): the step of the first-time setup wizard, so you continue where you left off after closing the window.',
      ],
    },
    {
      heading: 'Third-party services',
      paragraphs: [
        'When you pay you are redirected to Stripe pages, which use their own cookies under their own policies. We do not integrate third-party advertising or analytics tools on our pages.',
      ],
    },
    {
      heading: 'How to change your consent',
      paragraphs: [
        'You can change or withdraw your choice at any time via the “Cookie settings” link in the page footer. You can also delete cookies in your browser settings; necessary cookies will be set again on your next visit.',
      ],
    },
  ],
})
