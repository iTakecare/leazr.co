/**
 * Bridge avec l'extension Chrome Leazr Sourcing Helper.
 *
 * La communication se fait via :
 *  - CustomEvent("leazr-sourcing-extension-ready") pour la détection (du content script)
 *  - CustomEvent("leazr-sourcing-detect") pour demander une nouvelle annonce
 *  - CustomEvent("leazr-sourcing-progress") pour les événements de progression
 *  - chrome.runtime.sendMessage(EXTENSION_ID, ...) pour envoyer des requêtes
 *    (disponible grâce à externally_connectable dans le manifest)
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
  source: string;
}

export type SearchProgressEvent =
  | { type: "search_started"; sources: string[] }
  | { type: "source_started"; source: string }
  | {
      type: "source_result";
      source: string;
      offers: OfferFromExtension[];
      all_offers?: OfferFromExtension[];
    }
  | { type: "source_failed"; source: string; error: string }
  | { type: "search_completed"; total_offers: number; duration_ms: number };

export interface FinalSearchResponse {
  success: boolean;
  offers: OfferFromExtension[];
  errors: Array<{ source: string; error: string }>;
  duration_ms: number;
}

/** Cache de l'info d'extension (premier event reçu) */
let cachedInfo: ExtensionInfo | null = null;

// Écouter en permanence les annonces (posées par le content script) → cache
if (typeof window !== "undefined") {
  window.addEventListener("leazr-sourcing-extension-ready", (e: Event) => {
    const detail = (e as CustomEvent).detail as ExtensionInfo;
    if (detail?.installed) {
      cachedInfo = detail;
    }
  });
}

/**
 * Détecte si l'extension est installée.
 * - Si déjà détectée → retour immédiat
 * - Sinon : envoie un event "leazr-sourcing-detect" et attend max 2s
 */
export async function detectExtension(): Promise<ExtensionInfo> {
  if (cachedInfo) return cachedInfo;

  return new Promise<ExtensionInfo>((resolve) => {
    let resolved = false;

    const onReady = (e: Event) => {
      if (resolved) return;
      const detail = (e as CustomEvent).detail as ExtensionInfo;
      if (detail?.installed) {
        cachedInfo = detail;
        resolved = true;
        window.removeEventListener("leazr-sourcing-extension-ready", onReady);
        resolve(detail);
      }
    };

    window.addEventListener("leazr-sourcing-extension-ready", onReady);

    // Demander explicitement une annonce (au cas où le content script est chargé
    // mais qu'on a raté son event initial)
    try {
      window.dispatchEvent(new CustomEvent("leazr-sourcing-detect"));
    } catch {
      /* ignore */
    }

    // Timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener("leazr-sourcing-extension-ready", onReady);
        resolve(cachedInfo ?? { installed: false });
      }
    }, 2000);
  });
}

/**
 * Lance une recherche multi-source via l'extension.
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
      "Extension Chrome non détectée. Installe-la pour utiliser la recherche multi-source."
    );
  }

  // Écoute des progrès (posés par le content script via CustomEvent)
  const progressListener = (e: Event) => {
    const detail = (e as CustomEvent).detail as SearchProgressEvent;
    options.onProgress?.(detail);
  };
  window.addEventListener("leazr-sourcing-progress", progressListener);

  try {
    const response = await new Promise<FinalSearchResponse>((resolve, reject) => {
      // chrome.runtime est injecté par Chrome dans la page quand externally_connectable est actif
      const chromeRuntime = (window as any).chrome?.runtime;
      if (!chromeRuntime?.sendMessage) {
        reject(
          new Error(
            "chrome.runtime.sendMessage indisponible — l'extension ne semble pas déclarer externally_connectable pour ce domaine"
          )
        );
        return;
      }
      chromeRuntime.sendMessage(
        info.extension_id,
        {
          type: "multi_source_search",
          query,
          limit_per_source: options.limit_per_source ?? 3,
          timeout_ms: options.timeout_ms ?? 20000,
          sources: options.sources,
        },
        (response: FinalSearchResponse | undefined) => {
          const lastErr = chromeRuntime.lastError;
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
    window.removeEventListener("leazr-sourcing-progress", progressListener);
  }
}

/** Handshake simple (utile pour bouton "Tester la connexion") */
export async function pingExtension(): Promise<boolean> {
  try {
    const info = await detectExtension();
    if (!info.installed || !info.extension_id) return false;
    const chromeRuntime = (window as any).chrome?.runtime;
    if (!chromeRuntime?.sendMessage) return false;
    await new Promise<unknown>((resolve, reject) => {
      chromeRuntime.sendMessage(info.extension_id, { type: "handshake" }, (resp: unknown) => {
        const err = chromeRuntime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(resp);
      });
    });
    return true;
  } catch {
    return false;
  }
}
