/**
 * Orchestrateur multi-source.
 *
 * Fait un fetch() depuis le service worker pour chaque fournisseur, puis
 * délègue le parsing HTML à un offscreen document (DOMParser indisponible
 * dans un service worker MV3).
 */
import { adapters } from "../content/adapters";
import { filterOffersByRelevance } from "../lib/parse-helpers";
import type { CapturedOffer, SearchRequest, SearchProgressMessage, SearchResponse, SiteAdapter } from "../lib/types";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_LIMIT_PER_SOURCE = 3;
const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

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
    // Fetch SANS credentials par défaut : les cookies Coolblue Business du user
    // peuvent déclencher des challenges Cloudflare ou redirections B2B spécifiques.
    // On ouvre incognito en quelque sorte, pour avoir un comportement prévisible.
    console.log(`[fetchAndParse] Requesting ${url}`);
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: "omit",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.8,nl;q=0.7",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeoutId);

    console.log(`[fetchAndParse] Response ${response.status} (${response.headers.get("content-type")})`);

    if (!response.ok) {
      return { error: `HTTP ${response.status}`, status: response.status };
    }

    const html = await response.text();
    console.log(`[fetchAndParse] Got ${html.length} bytes of HTML`);
    if (html.length < 500) {
      return { error: `HTML trop court (${html.length} bytes — page rendue côté client ?)` };
    }

    const offers = await parseSearchHtml(html, url, adapter.key, limit);
    console.log(`[fetchAndParse] Parsed ${offers.length} offers from ${url}`);
    return { offers };
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") return { error: "Timeout" };
    const msg = e?.message ?? String(e);
    console.error(`[fetchAndParse] Error on ${url}:`, e);
    return { error: `Fetch: ${msg}` };
  }
}

/**
 * Pour les offres Coolblue refurb qui ont needs_price_enrichment, fetch
 * la page détail et extrait le prix via offscreen.
 */
async function enrichRefurbishedPrices(offers: CapturedOffer[]): Promise<CapturedOffer[]> {
  const toEnrich = offers.filter((o) => (o.raw_specs as any)?.needs_price_enrichment);
  if (toEnrich.length === 0) return offers;

  console.log(`[Orchestrator] Enrichissement de ${toEnrich.length} prix refurb…`);

  await ensureOffscreenDocument();

  const enriched = await Promise.allSettled(
    toEnrich.map(async (offer) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(offer.url, {
          signal: controller.signal,
          credentials: "omit",
          headers: {
            Accept: "text/html",
            "Accept-Language": "fr-BE,fr;q=0.9",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          },
        });
        clearTimeout(timeoutId);
        if (!resp.ok) return { url: offer.url, price_cents: null };
        const html = await resp.text();
        const result = await sendToOffscreen<{ price_cents: number | null }>({
          type: "offscreen_enrich_coolblue_price",
          html,
        });
        return { url: offer.url, price_cents: result.price_cents };
      } catch (e) {
        console.warn(`[Orchestrator] Enrich failed for ${offer.url}:`, e);
        return { url: offer.url, price_cents: null };
      }
    })
  );

  // Merger les prix dans les offres originales
  const priceMap = new Map<string, number>();
  for (const r of enriched) {
    if (r.status === "fulfilled" && r.value.price_cents) {
      priceMap.set(r.value.url, r.value.price_cents);
    }
  }

  return offers
    .map((o) => {
      const p = priceMap.get(o.url);
      if (p) {
        return {
          ...o,
          price_cents: p,
          raw_specs: {
            ...(o.raw_specs as Record<string, unknown>),
            vat_excluded: true,
            needs_price_enrichment: false,
          },
        };
      }
      return o;
    })
    // Filtrer les offres dont on n'a pas pu récupérer le prix
    .filter((o) => o.price_cents > 0);
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
      // Succès : enrichir les prix si nécessaire (Coolblue refurb)
      let finalOffers = result.offers;
      if (adapter.key === "coolblue" && finalOffers.some((o) => (o.raw_specs as any)?.needs_price_enrichment)) {
        finalOffers = await enrichRefurbishedPrices(finalOffers);
      }
      // Filtre de pertinence centralisé (Pro/Air discrimination, etc.)
      const before = finalOffers.length;
      finalOffers = filterOffersByRelevance(finalOffers, query).slice(0, limit);
      console.log(`[Orchestrator][${adapter.key}] (${label}) relevance: ${finalOffers.length}/${before} retained`);

      if (finalOffers.length === 0) {
        lastError = "Aucun résultat pertinent";
        if (!isLast) continue;
        return { source: adapter.key, error: lastError };
      }
      return { source: adapter.key, offers: finalOffers };
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

  const searchable = adapters.filter(
    (a) => (a.buildSearchUrl || a.buildSearchUrls) && a.extractSearchResults
  );
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
