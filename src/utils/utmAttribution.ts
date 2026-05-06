/**
 * UTM / ad-click attribution capture.
 *
 * Marketing ads (Meta, Google, …) land users on /:companySlug/... with query
 * params like utm_source=facebook, utm_campaign=spring-2026, fbclid=…
 *
 * Capture happens once on landing, persists to sessionStorage, and travels
 * with the user through the multi-step funnel (catalog → cart → /demande)
 * until the offer is created. The values are then forwarded to the
 * create-product-request edge function and stored on the offer row.
 */
export interface AttributionData {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  fbclid?: string | null;
  landing_referrer?: string | null;
}

const STORAGE_KEY = "leazr_utm_attribution";
const MAX_UTM_LENGTH = 200;
const MAX_REFERRER_LENGTH = 500;

const ATTRIBUTION_KEYS: (keyof AttributionData)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
];

function safeTrim(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.substring(0, maxLength);
}

/**
 * Reads UTM / fbclid params from a URL query string. Returns null if the
 * search string carries no attribution-relevant keys.
 */
export function parseAttributionFromSearch(search: string): AttributionData | null {
  if (typeof search !== "string" || !search) return null;
  const params = new URLSearchParams(search);
  const result: AttributionData = {};
  let found = false;
  for (const key of ATTRIBUTION_KEYS) {
    const limit = key === "fbclid" ? MAX_REFERRER_LENGTH : MAX_UTM_LENGTH;
    const v = safeTrim(params.get(key), limit);
    if (v) {
      result[key] = v;
      found = true;
    }
  }
  return found ? result : null;
}

/**
 * Capture-and-persist on landing. Idempotent — once we have a value we don't
 * overwrite it on subsequent navigation, otherwise an internal click would
 * lose the original attribution. (We do overwrite if a NEW campaign click
 * arrives, i.e. fresh utm_source.)
 */
export function captureAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;

  const fromUrl = parseAttributionFromSearch(window.location.search);
  const stored = readStoredAttribution();

  if (fromUrl) {
    // New click overrides — last-touch attribution.
    const referrer = safeTrim(document.referrer, MAX_REFERRER_LENGTH);
    const enriched: AttributionData = {
      ...fromUrl,
      landing_referrer: referrer && !referrer.includes(window.location.host)
        ? referrer
        : stored?.landing_referrer || null,
    };
    persistAttribution(enriched);
    return enriched;
  }

  return stored;
}

export function readStoredAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as AttributionData;
  } catch {
    return null;
  }
}

function persistAttribution(data: AttributionData) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* sessionStorage unavailable — silently degrade */
  }
}

export function clearStoredAttribution() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
