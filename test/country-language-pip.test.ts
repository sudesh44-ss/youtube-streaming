import assert from "node:assert";
import { COUNTRIES, DEFAULT_COUNTRY, isValidCountryCode, getCountryByCode } from "../src/lib/countries";
import { translations, Language } from "../src/lib/i18n/translations";
import { resolveCountryAndLanguage } from "../src/lib/auth";

console.log("=== Testing Country, Language & Regional Personalization ===");

// 1. Countries Validation
console.log("\n1. Testing Countries Data Structure...");
assert(Array.isArray(COUNTRIES), "COUNTRIES should be an array");
assert(COUNTRIES.length >= 50, `Expected at least 50 countries, found ${COUNTRIES.length}`);

// Check uniqueness of country codes
const codes = new Set<string>();
for (const country of COUNTRIES) {
  assert(country.code && country.code.length === 2, `Invalid country code: ${country.code}`);
  assert(country.name && country.name.length > 0, `Invalid country name for ${country.code}`);
  assert(country.flag && country.flag.length > 0, `Invalid flag for ${country.code}`);
  assert(!codes.has(country.code), `Duplicate country code detected: ${country.code}`);
  codes.add(country.code);
}
console.log(`[PASS] Verified ${COUNTRIES.length} unique countries with valid ISO 3166-1 alpha-2 codes and flags.`);

// Test isValidCountryCode
assert(isValidCountryCode("US") === true, "US should be valid");
assert(isValidCountryCode("IN") === true, "IN should be valid");
assert(isValidCountryCode("GB") === true, "GB should be valid");
assert(isValidCountryCode("JP") === true, "JP should be valid");
assert(isValidCountryCode("us") === true, "Case-insensitive code should be valid");
assert(isValidCountryCode("XYZ") === false, "XYZ should not be valid");
assert(isValidCountryCode("") === false, "Empty string should not be valid");
console.log("[PASS] isValidCountryCode correctly validates valid and invalid ISO codes.");

// Test getCountryByCode
assert(getCountryByCode("IN")?.name === "India", "getCountryByCode('IN') should return India");
assert(getCountryByCode("US")?.name === "United States", "getCountryByCode('US') should return United States");
assert(getCountryByCode("unknown")?.code === DEFAULT_COUNTRY, "Unknown code should fall back to DEFAULT_COUNTRY");
console.log("[PASS] getCountryByCode resolves correct countries and fallbacks.");

// 2. Translations Coverage
console.log("\n2. Testing Translation Dictionaries...");
const enKeys = Object.keys(translations.en);
const hiKeys = Object.keys(translations.hi);
console.log(`English dictionary has ${enKeys.length} keys, Hindi has ${hiKeys.length} keys.`);

assert(enKeys.length > 50, "Expected at least 50 English translation keys");
for (const key of enKeys) {
  assert(
    translations.hi[key] !== undefined,
    `Missing Hindi translation for key: "${key}"`
  );
  assert(
    typeof translations.en[key] === "string" && translations.en[key].length > 0,
    `Empty English translation for key: "${key}"`
  );
  assert(
    typeof translations.hi[key] === "string" && translations.hi[key].length > 0,
    `Empty Hindi translation for key: "${key}"`
  );
}
console.log(`[PASS] 100% of English translation keys (${enKeys.length}/${enKeys.length}) have corresponding Hindi translations.`);

// 3. User Session Preferences Parsing
console.log("\n3. Testing Session Country & Language Resolver...");

// Direct country and language columns
const sessionA = resolveCountryAndLanguage({ country: "IN", language: "hi" });
assert.strictEqual(sessionA.country, "IN");
assert.strictEqual(sessionA.language, "hi");

// Fallback to embedded country tag in preferred_languages
const sessionB = resolveCountryAndLanguage({ preferred_languages: ["en", "country:JP"] });
assert.strictEqual(sessionB.country, "JP");
assert.strictEqual(sessionB.language, "en");

// Hindi embedded in preferred_languages
const sessionC = resolveCountryAndLanguage({ preferred_languages: ["hi", "country:FR"] });
assert.strictEqual(sessionC.country, "FR");
assert.strictEqual(sessionC.language, "hi");

// Completely empty preferences fallback to defaults
const sessionD = resolveCountryAndLanguage({});
assert.strictEqual(sessionD.country, "US");
assert.strictEqual(sessionD.language, "en");

console.log("[PASS] resolveCountryAndLanguage safely parses both schema columns and embedded JSONB fallbacks.");

console.log("\n=== ALL REGIONAL & LOCALIZATION TESTS PASSED ===");
