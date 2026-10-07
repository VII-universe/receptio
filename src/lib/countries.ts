// Země, ve kterých lze koupit telefonní číslo (Twilio) a na které lze volat testovací hovor.
export const SUPPORTED_COUNTRIES = [
  { code: 'CZ', name: 'Česká republika', prefix: '+420', flag: '🇨🇿' },
  { code: 'SK', name: 'Slovensko', prefix: '+421', flag: '🇸🇰' },
  { code: 'DE', name: 'Německo', prefix: '+49', flag: '🇩🇪' },
  { code: 'AT', name: 'Rakousko', prefix: '+43', flag: '🇦🇹' },
  { code: 'PL', name: 'Polsko', prefix: '+48', flag: '🇵🇱' },
  { code: 'HU', name: 'Maďarsko', prefix: '+36', flag: '🇭🇺' },
  { code: 'RO', name: 'Rumunsko', prefix: '+40', flag: '🇷🇴' },
  { code: 'HR', name: 'Chorvatsko', prefix: '+385', flag: '🇭🇷' },
  { code: 'FR', name: 'Francie', prefix: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Itálie', prefix: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Španělsko', prefix: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Nizozemsko', prefix: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgie', prefix: '+32', flag: '🇧🇪' },
  { code: 'SE', name: 'Švédsko', prefix: '+46', flag: '🇸🇪' },
  { code: 'DK', name: 'Dánsko', prefix: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finsko', prefix: '+358', flag: '🇫🇮' },
  { code: 'PT', name: 'Portugalsko', prefix: '+351', flag: '🇵🇹' },
  { code: 'GB', name: 'Spojené království', prefix: '+44', flag: '🇬🇧' },
] as const

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]['code']

export const isCountryCode = (v: unknown): v is CountryCode =>
  typeof v === 'string' && SUPPORTED_COUNTRIES.some((c) => c.code === v)

// Od nejdelší předvolby, aby se +385 nespletlo např. s +38.
const BY_PREFIX_LENGTH = [...SUPPORTED_COUNTRIES].sort((a, b) => b.prefix.length - a.prefix.length)

/** Země podle předvolby čísla v E.164 (nebo undefined). */
export const countryOfNumber = (e164: string) => BY_PREFIX_LENGTH.find((c) => e164.startsWith(c.prefix))
