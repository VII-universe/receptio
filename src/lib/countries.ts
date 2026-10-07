// Země, ve kterých lze koupit telefonní číslo (Twilio) a na které lze volat testovací hovor.
export const SUPPORTED_COUNTRIES = [
  { code: 'CZ', name: 'Czech Republic', prefix: '+420', flag: '🇨🇿' },
  { code: 'SK', name: 'Slovakia', prefix: '+421', flag: '🇸🇰' },
  { code: 'DE', name: 'Germany', prefix: '+49', flag: '🇩🇪' },
  { code: 'AT', name: 'Austria', prefix: '+43', flag: '🇦🇹' },
  { code: 'PL', name: 'Poland', prefix: '+48', flag: '🇵🇱' },
  { code: 'HU', name: 'Hungary', prefix: '+36', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', prefix: '+40', flag: '🇷🇴' },
  { code: 'HR', name: 'Croatia', prefix: '+385', flag: '🇭🇷' },
  { code: 'FR', name: 'France', prefix: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', prefix: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', prefix: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', prefix: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', prefix: '+32', flag: '🇧🇪' },
  { code: 'SE', name: 'Sweden', prefix: '+46', flag: '🇸🇪' },
  { code: 'DK', name: 'Denmark', prefix: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', prefix: '+358', flag: '🇫🇮' },
  { code: 'PT', name: 'Portugal', prefix: '+351', flag: '🇵🇹' },
  { code: 'GB', name: 'United Kingdom', prefix: '+44', flag: '🇬🇧' },
] as const

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]['code']

export const isCountryCode = (v: unknown): v is CountryCode =>
  typeof v === 'string' && SUPPORTED_COUNTRIES.some((c) => c.code === v)

// Od nejdelší předvolby, aby se +385 nespletlo např. s +38.
const BY_PREFIX_LENGTH = [...SUPPORTED_COUNTRIES].sort((a, b) => b.prefix.length - a.prefix.length)

/** Země podle předvolby čísla v E.164 (nebo undefined). */
export const countryOfNumber = (e164: string) => BY_PREFIX_LENGTH.find((c) => e164.startsWith(c.prefix))
