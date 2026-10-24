/**
 * OmniDiscover Functional Cookie & Client Storage Consent Manager
 *
 * Implements a strict, verifiable consent architecture adhering to ePrivacy,
 * GDPR, and DPDP principles:
 * - Necessary cookies (sessions, CSRF) are always active and strictly isolated.
 * - Functional browser storage (theme, region, offline search cache) is gated by user consent.
 * - Analytics and advertising categories are locked off because OmniDiscover deploys zero trackers.
 * - Provides centralized getters, real-time event dispatching, and cleanup routines.
 */

export interface CookieConsentPreferences {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  advertising: boolean;
  timestamp: number;
  version: number;
}

export const CONSENT_STORAGE_KEY = "omnidiscover_cookie_consent";
export const CURRENT_CONSENT_VERSION = 2;
export const CONSENT_CHANGE_EVENT = "omnidiscover_consent_changed";
export const OPEN_COOKIE_SETTINGS_EVENT = "open-cookie-settings";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Retrieves the currently saved consent preferences, or null if the user has not yet consented.
 */
export function getStoredConsent(): CookieConsentPreferences | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.version === CURRENT_CONSENT_VERSION) {
      return {
        necessary: true,
        functional: Boolean(parsed.functional),
        analytics: false,
        advertising: false,
        timestamp: Number(parsed.timestamp) || Date.now(),
        version: CURRENT_CONSENT_VERSION,
      };
    }
  } catch {
    // LocalStorage restricted or corrupt
  }
  return null;
}

/**
 * Checks whether storage operations for a given category are legally permitted.
 */
export function isConsentGranted(category: "necessary" | "functional" | "analytics" | "advertising"): boolean {
  if (category === "necessary") return true;
  if (!isBrowser()) return false;

  const current = getStoredConsent();
  if (!current) {
    // Before explicit consent is recorded, optional categories must NOT run
    return false;
  }

  return Boolean(current[category]);
}

/**
 * Purges optional client storage entries when optional consent is rejected or revoked.
 */
export function cleanupOptionalStorage(): void {
  if (!isBrowser()) return;
  try {
    const optionalKeys = [
      "omnidiscover_watchlist",
      "omnidiscover_watch_later",
      "omnidiscover_likes",
      "omnidiscover_watch_history_v1",
      "omnidiscover_search_history_v1",
      "omnidiscover_country",
      "omnidiscover_language",
      "app_language",
      "platform_theme",
      "omnidiscover_yt_popup_dismissed",
    ];

    for (const key of optionalKeys) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Safe iteration
      }
    }

    // Also attempt IndexedDB search cache purge
    if (typeof window.indexedDB !== "undefined") {
      try {
        window.indexedDB.deleteDatabase("omnidiscover_search_cache_db");
      } catch {
        // Safe fallback
      }
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Persists the user's custom consent selections and dispatches a change event.
 */
export function saveConsentPreferences(
  prefs: Partial<Pick<CookieConsentPreferences, "functional">>
): CookieConsentPreferences {
  const finalPrefs: CookieConsentPreferences = {
    necessary: true,
    functional: Boolean(prefs.functional),
    analytics: false,
    advertising: false,
    timestamp: Date.now(),
    version: CURRENT_CONSENT_VERSION,
  };

  if (isBrowser()) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(finalPrefs));
    } catch {
      // Safe fallback
    }

    if (!finalPrefs.functional) {
      cleanupOptionalStorage();
    }

    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: finalPrefs }));
  }

  return finalPrefs;
}

/**
 * One-click helper: Accepts all permitted categories (Essential + Functional).
 */
export function acceptAllConsent(): CookieConsentPreferences {
  return saveConsentPreferences({ functional: true });
}

/**
 * One-click helper: Rejects all optional storage, keeping only strictly necessary security cookies.
 */
export function rejectOptionalConsent(): CookieConsentPreferences {
  return saveConsentPreferences({ functional: false });
}

/**
 * Triggers the UI modal/banner to reopen from any page or footer link.
 */
export function reopenCookieConsentModal(): void {
  if (isBrowser()) {
    window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
  }
}
