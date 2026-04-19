/**
 * Orchestrateur multi-source.
 *
 * Fait un fetch() depuis le service worker pour chaque fournisseur, puis
 * délègue le parsing HTML à un offscreen document (DOMParser indisponible
 * dans un service worker MV3).
 */
import { adapters } from "../content/adapters";
import type { CapturedOffer, SearchRequest, SearchProgressMessage, SearchResponse, SiteAdapter } from "../lib/types";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_LIMIT_PER_SOURCE = 3;
const OFFSCREEN_DOCUMENT_PATH = "src/offscreen/offscreen.html";

let offscreenCreating: Promise<void> | null = null;

/**
 * Crée le offscreen document s'il n'existe pas déjà.
 * Idempotent + safe contre les races.
 */
async function ensureOffscreenDocument(): Promise<void> {
  // @ts-expect-error — chrome.runtime.getContexts existe depuis Chrome 116
  const hasGetContexts = typeof chrome.runtime.getContexts === "function";

  if (hasGetContexts) {
    // @ts-expect-error
    const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
    if (contexts && contexts.length > 0) return;
  }

  // Éviter les doubles créations si plusieurs searches en parallèle appellent ensure()
  if (offscreenCreating) return offscreenCreating;

  offscreenCreating = (async () => {
    try {
      await chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: [chrome.offscreen.Reason.DOM_PARSER],
        justification: "Parse HTML from supplier search pages to extract product offers",
      });
      // Laisser le temps au script offscreen de s'initialiser
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (e: any) {
      // Si quelqu'un d'autre l'a créé entre-temps, ignorer
      if (!/already|already exists/i.test(e?.message ?? "")) {
        throw e;
      }
    } finally {
      offscreenCreating = null;
    }
  })();

  return offscreenCreating;
}

/** Envoie un message à l'offscreen et attend la réponse */
function sendToOffscreen<T>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (resp: T & { error?: string }) => {
      const lastErr = chrome.runtime.lastError;
      if (lastErr) return reject(new Error(lastErr.message));
      if (!resp) return reject(new Error("Pas de réponse de l'offscreen"));
      if ((resp as any).error) return reject(new Error((resp as any).error));
      resolve(resp);
    });
  });
}

/** Parse le HTML dans l'offscreen document via l'adapter correspondant */
async function parseSearchHtml(
  html: string,
  url: string,
  adapter_key: string,
  limit: number
): Promise<CapturedOffer[]> {
  await ensureOffscreenDocument();
  const resp = await sendToOffscreen<{ offers: CapturedOffer[] }>({
    type: "offscreen_parse_search",
    html,
    url,
    adapter_key,
    limit,
  });
  return resp.offers ?? [];
}

/**
 * Fait un fetch() + parse HTML via offscreen + appelle extractSearchResults.
 */
async function fetchAndParse(
  adapter: SiteAdapter,
  url: string,
  limit: number,
  timeout_ms: number
): Promise<{ offers: CapturedOffer[] } | { error: string; status?: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: "include",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.8,nl;q=0.7",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { error: `HTTP ${response.status}`, status: response.status };
    }

    const html = await response.text();
    if (html.length < 500) {
      return { error: "Réponse HTML vide/trop courte" };
    }

    const offers = await parseSearchHtml(html, url, adapter.key, limit);
    return { offers };
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") return { error: "Timeout" };
    return { error: e.message ?? "Erreur inconnue" };
  }
}

async function searchOne(
  adapter: SiteAdapter,
  query: string,
  limit: number,
  timeout_ms: number
): Promise<{ source: string; offers: CapturedOffer[] } | { source: string; error: string }> {
  if (!adapter.extractSearchResults) {
    return { source: adapter.key, error: "Adapter ne supporte pas la recherche multi-source" };
  }

  // Construire la liste d'URLs à essayer dans l'ordre de préférence
  const urls: string[] = adapter.buildSearchUrls
    ? adapter.buildSearchUrls(query)
    : adapter.buildSearchUrl
    ? [adapter.buildSearchUrl(query)]
    : [];

  if (urls.length === 0) {
    return { source: adapter.key, error: "Aucune URL candidate" };
  }

  let lastError = "Aucune URL n'a donné de résultats";

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const isLast = i === urls.length - 1;
    const label = i === 0 ? "primary" : i === urls.length - 1 ? "last-fallback" : `fallback-${i}`;
    console.log(`[Orchestrator][${adapter.key}] (${label}) Fetching ${url}`);

    const result = await fetchAndParse(adapter, url, limit, timeout_ms);

    if ("error" in result) {
      lastError = result.error;
      console.log(`[Orchestrator][${adapter.key}] (${label}) ${result.error}`);
      // Continuer vers le prochain candidat (sauf si c'était le dernier)
      if (!isLast) continue;
    } else if (result.offers.length === 0) {
      lastError = "Aucun résultat pertinent";
      console.log(`[Orchestrator][${adapter.key}] (${label}) 0 résultats pertinents`);
      if (!isLast) continue;
    } else {
      // Succès : on retourne les offres
      console.log(`[Orchestrator][${adapter.key}] (${label}) ${result.offers.length} offres`);
      return { source: adapter.key, offers: result.offers };
    }
  }

  return { source: adapter.key, error: lastError };
}

/**
 * Lance la recherche sur toutes les sources en parallèle.
 */
export async function runMultiSourceSearch(
  request: SearchRequest,
  onProgress: (msg: SearchProgressMessage) => void
): Promise<SearchResponse> {
  const start = performance.now();
  const limit = request.limit_per_source ?? DEFAULT_LIMIT_PER_SOURCE;
  const timeout = request.timeout_ms ?? DEFAULT_TIMEOUT_MS;

  const searchable = adapters.filter((a) => a.buildSearchUrl && a.extractSearchResults);
  const enabled = request.sources?.length
    ? searchable.filter((a) => request.sources!.includes(a.key))
    : searchable;

  onProgress({ type: "search_started", sources: enabled.map((a) => a.key) });

  const allOffers: Array<CapturedOffer & { source: string }> = [];
  const errors: Array<{ source: string; error: string }> = [];

  // Pré-chauffer l'offscreen pour éviter la latence au premier appel
  ensureOffscreenDocument().catch(() => { /* pas grave, retry automatique via searchOne */ });

  await Promise.allSettled(
    enabled.map(async (adapter) => {
      onProgress({ type: "source_started", source: adapter.key });
      const result = await searchOne(adapter, request.query, limit, timeout);

      if ("error" in result) {
        errors.push(result);
        onProgress({ type: "source_failed", source: adapter.key, error: result.error });
      } else {
        const withSource = result.offers.map((o) => ({ ...o, source: adapter.key }));
        allOffers.push(...withSource);
        onProgress({ type: "source_result", source: adapter.key, offers: result.offers });
      }
    })
  );

  const duration_ms = Math.round(performance.now() - start);
  onProgress({ type: "search_completed", total_offers: allOffers.length, duration_ms });

  return { success: true, offers: allOffers, errors, duration_ms };
}
