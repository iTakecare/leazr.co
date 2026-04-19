/**
 * Bridge avec l'extension Chrome Leazr Sourcing Helper.
 *
 * - Détection de présence via window.__LEAZR_SOURCING_EXTENSION__
 *   (posé par le content script leazr-bridge.ts)
 * - Envoi de messages au service worker via chrome.runtime.sendMessage
 *   (dispo grâce à externally_connectable)
 * - Écoute des messages de progression via window.postMessage
 */

export interface ExtensionInfo {
  installed: boolean;
  version?: string;
  extension_id?: string;
}

export interface OfferFromExtension {
  title: string;
  brand?: string;
  price_cents: number;
  currency: string;
  delivery_cost_cents?: number;
  delivery_days_min?: number;
  delivery_days_max?: number;
  condition?: string;
  warranty_months?: number;
  url: string;
  image_url?: string;
  stock_status?: string;
  captured_host: string;
  raw_specs?: Record<string, unknown>;
  source: string; // clé de l'adapter (coolblue, mediamarkt, ...)
}

export type SearchProgressEvent =
  | { type: "search_started"; sources: string[] }
  | { type: "source_started"; source: string }
  | { type: "source_result"; source: string; offers: OfferFromExtension[] }
  | { type: "source_failed"; source: string; error: string }
  | { type: "search_completed"; total_offers: number; duration_ms: number };

export interface FinalSearchResponse {
  success: boolean;
  offers: OfferFromExtension[];
  errors: Array<{ source: string; error: string }>;
  duration_ms: number;
}

declare global {
  interface Window {
    __LEAZR_SOURCING_EXTENSION__?: ExtensionInfo;
  }
}

/**
 * Détecte si l'extension est installée. Attend jusqu'à 1500ms le content script
 * qui pose la variable globale, puis retombe sur false.
 */
export async function detectExtension(): Promise<ExtensionInfo> {
  if (window.__LEAZR_SOURCING_EXTENSION__) return window.__LEAZR_SOURCING_EXTENSION__;

  return new Promise<ExtensionInfo>((resolve) => {
    const onReady = (e: Event) => {
      const detail = (e as CustomEvent).detail as ExtensionInfo;
      window.removeEventListener("leazr-sourcing-extension-ready", onReady);
      resolve(detail);
    };
    window.addEventListener("leazr-sourcing-extension-ready", onReady);
    setTimeout(() => {
      window.removeEventListener("leazr-sourcing-extension-ready", onReady);
      resolve(window.__LEAZR_SOURCING_EXTENSION__ ?? { installed: false });
    }, 1500);
  });
}

/**
 * Lance une recherche multi-source via l'extension.
 * Reçoit les résultats en streaming via `onProgress`, retourne la réponse finale.
 */
export async function searchViaExtension(
  query: string,
  options: {
    limit_per_source?: number;
    timeout_ms?: number;
    sources?: string[];
    onProgress?: (evt: SearchProgressEvent) => void;
  } = {}
): Promise<FinalSearchResponse> {
  const info = await detectExtension();
  if (!info.installed || !info.extension_id) {
    throw new Error(
      "Extension Chrome non détectée. Installe-la depuis /admin/sourcing pour utiliser la recherche multi-source."
    );
  }

  // Écoute des messages de progression (via window.postMessage depuis le content script)
  const progressListener = (e: MessageEvent) => {
    if (e.source !== window) return;
    if (!e.data?.__leazr_sourcing) return;
    options.onProgress?.(e.data as SearchProgressEvent);
  };
  window.addEventListener("message", progressListener);

  try {
    const response = await new Promise<FinalSearchResponse>((resolve, reject) => {
      // @ts-expect-error — chrome est injecté par l'extension via externally_connectable
      if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
        reject(new Error("chrome.runtime indisponible (extension non injectée ?)"));
        return;
      }
      // @ts-expect-error
      chrome.runtime.sendMessage(
        info.extension_id,
        {
          type: "multi_source_search",
          query,
          limit_per_source: options.limit_per_source ?? 3,
          timeout_ms: options.timeout_ms ?? 20000,
          sources: options.sources,
        },
        (response: FinalSearchResponse) => {
          // @ts-expect-error
          const lastErr = chrome.runtime?.lastError;
          if (lastErr) {
            reject(new Error(lastErr.message));
          } else if (!response) {
            reject(new Error("Réponse vide de l'extension"));
          } else {
            resolve(response);
          }
        }
      );
    });
    return response;
  } finally {
    window.removeEventListener("message", progressListener);
  }
}

/**
 * Ping de l'extension (ex: pour bouton "Tester la connexion")
 */
export async function pingExtension(): Promise<boolean> {
  try {
    const info = await detectExtension();
    if (!info.installed || !info.extension_id) return false;
    await new Promise<unknown>((resolve, reject) => {
      // @ts-expect-error
      chrome.runtime.sendMessage(info.extension_id, { type: "handshake" }, (resp) => {
        // @ts-expect-error
        const err = chrome.runtime?.lastError;
        if (err) reject(new Error(err.message));
        else resolve(resp);
      });
    });
    return true;
  } catch {
    return false;
  }
}
