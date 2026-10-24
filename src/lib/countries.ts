export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
];

export const DEFAULT_COUNTRY = "US";

const VALID_COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code.toUpperCase()));

export function isValidCountryCode(code: string | undefined | null): boolean {
  if (!code || typeof code !== "string") return false;
  return VALID_COUNTRY_CODES.has(code.trim().toUpperCase());
}

export function getCountryByCode(code: string | undefined | null): Country {
  if (!code) return COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY) || COUNTRIES[0];
  const upper = code.trim().toUpperCase();
  return COUNTRIES.find((c) => c.code === upper) || COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY) || COUNTRIES[0];
}
