/**
 * Orchestrateur multi-source.
 *
 * Reçoit une query, appelle en parallèle tous les adapters qui supportent
 * la recherche, fait les fetch() HTML depuis le service worker (bypass CORS
 * et utilise les cookies du navigateur de l'utilisateur), parse avec DOMParser.
 *
 * Envoie des messages de progression via un port Chrome runtime au fur et à
 * mesure, et retourne le résultat agrégé à la fin.
 */
import { adapters } from "../content/adapters";
import type { CapturedOffer, SearchRequest, SearchProgressMessage, SearchResponse, SiteAdapter } from "../lib/types";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_LIMIT_PER_SOURCE = 3;

/**
 * Fait un fetch() + parse HTML + appelle extractSearchResults de l'adapter.
 * Timeout après `timeout_ms`.
 */
async function searchOne(
  adapter: SiteAdapter,
  query: string,
  limit: number,
  timeout_ms: number
): Promise<{ source: string; offers: CapturedOffer[] } | { source: string; error: string }> {
  if (!adapter.buildSearchUrl || !adapter.extractSearchResults) {
    return { source: adapter.key, error: "Adapter ne supporte pas la recherche multi-source" };
  }

  const url = adapter.buildSearchUrl(query);
  console.log(`[Orchestrator][${adapter.key}] Fetching ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: "include", // passe les cookies du navigateur (utile pour sites B2B loggés)
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.8,nl;q=0.7",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { source: adapter.key, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    // Certains sites injectent le contenu via JS, vérifier qu'on a bien du HTML rendu
    if (!doc.body || doc.body.innerHTML.length < 500) {
      return { source: adapter.key, error: "HTML vide ou insuffisant (page rendue côté client ?)" };
    }

    const offers = adapter.extractSearchResults(doc, new URL(url), limit);
    if (offers.length === 0) {
      return { source: adapter.key, error: "Aucun résultat extrait de la page" };
    }

    return { source: adapter.key, offers };
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") {
      return { source: adapter.key, error: "Timeout" };
    }
    return { source: adapter.key, error: e.message ?? "Erreur inconnue" };
  }
}

/**
 * Lance la recherche sur toutes les sources en parallèle.
 *
 * `onProgress` est appelé pour chaque événement (début, fin de source, etc.)
 * Le tableau retourné contient toutes les offres agrégées.
 */
export async function runMultiSourceSearch(
  request: SearchRequest,
  onProgress: (msg: SearchProgressMessage) => void
): Promise<SearchResponse> {
  const start = performance.now();
  const limit = request.limit_per_source ?? DEFAULT_LIMIT_PER_SOURCE;
  const timeout = request.timeout_ms ?? DEFAULT_TIMEOUT_MS;

  // Filtrer les adapters qui supportent la recherche
  const searchable = adapters.filter((a) => a.buildSearchUrl && a.extractSearchResults);
  const enabled = request.sources?.length
    ? searchable.filter((a) => request.sources!.includes(a.key))
    : searchable;

  onProgress({ type: "search_started", sources: enabled.map((a) => a.key) });

  const allOffers: Array<CapturedOffer & { source: string }> = [];
  const errors: Array<{ source: string; error: string }> = [];

  // Promise.allSettled : si une source échoue, on continue avec les autres
  await Promise.allSettled(
    enabled.map(async (adapter) => {
      onProgress({ type: "source_started", source: adapter.key });
      const result = await searchOne(adapter, request.query, limit, timeout);

      if ("error" in result) {
        errors.push(result);
        onProgress({ type: "source_failed", source: adapter.key, error: result.error });
      } else {
        // Tag chaque offre avec sa source
        const withSource = result.offers.map((o) => ({ ...o, source: adapter.key }));
        allOffers.push(...withSource);
        onProgress({ type: "source_result", source: adapter.key, offers: result.offers });
      }
    })
  );

  const duration_ms = Math.round(performance.now() - start);

  onProgress({
    type: "search_completed",
    total_offers: allOffers.length,
    duration_ms,
  });

  return {
    success: true,
    offers: allOffers,
    errors,
    duration_ms,
  };
}
