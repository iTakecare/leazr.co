/**
 * Adapter Gomibo (gomibo.be) — smartphones & tablettes belges.
 *
 * Gomibo SSR la LISTE sans prix, mais chaque page PRODUIT a un JSON-LD
 * Product avec name + price (TVAC). Comme Coolblue refurb, on fait :
 *  1. fetch page catégorie → extraction liens produits
 *  2. enrichissement : fetch chaque page détail en parallèle pour le prix
 *
 * L'enrichment est fait dans l'orchestrateur (même flag
 * needs_price_enrichment que Coolblue + un flag adapter_key pour que
 * l'offscreen route vers la bonne fonction d'extraction).
 */
import type { SiteAdapter, CapturedOffer, AdapterResult } from "../../lib/types";
import { publicHealthCheck } from "../../lib/health-check";

export const gomiboAdapter: SiteAdapter = {
  name: "gomibo",
  key: "gomibo",
  displayName: "Gomibo",
  loginUrl: "https://gomibo.be/fr",
  checkConnection: () => publicHealthCheck("https://gomibo.be/fr"),

  matches: (url) => /(^|\.)gomibo\.be$/.test(url.hostname),

  isProductPage: (_doc, url) =>
    /\/fr\/apple-(iphone|ipad)/.test(url.pathname) ||
    /\/fr\/accessoire-detail\//.test(url.pathname),

  extract: (doc, url): AdapterResult => {
    const p = extractJsonLdProduct(doc);
    if (!p) return { ok: false, reason: "Aucun Product JSON-LD" };
    return {
      ok: true,
      offer: {
        title: p.name,
        price_cents: Math.round(p.price_tvac / 1.21),
        currency: "EUR",
        condition: /refurbished|reconditionn/i.test(p.name) ? "grade_a" : "new",
        url: url.href,
        image_url: p.image_url,
        stock_status: "unknown",
        captured_host: url.hostname,
        raw_specs: {
          price_cents_tvac: p.price_tvac,
          vat_excluded: true,
        },
      },
    };
  },

  buildSearchUrls: (query: string) => {
    const normalized = query.trim().toLowerCase();
    const candidates: string[] = [];

    // Gomibo vend surtout téléphones + tablettes.
    if (/\biphone\b/i.test(normalized)) {
      // Refurb en priorité pour iTakecare
      candidates.push("https://gomibo.be/fr/telephone/apple-refurbished");
      candidates.push("https://gomibo.be/fr/telephone/apple");
    } else if (/\bipad\b/i.test(normalized)) {
      candidates.push("https://gomibo.be/fr/tablette/apple");
    } else if (/\bairpods\b/i.test(normalized)) {
      candidates.push("https://gomibo.be/fr/ecouteur/apple");
    } else if (/\bsamsung|galaxy\b/i.test(normalized)) {
      candidates.push("https://gomibo.be/fr/telephone/samsung");
    } else {
      // Gomibo = smartphones/tablettes. On ne spam pas pour du Mac/Watch/etc.
      return [];
    }
    return candidates;
  },

  extractSearchResults: (doc, url, limit = 5): CapturedOffer[] => {
    // Pattern des liens produit : /fr/apple-iphone-XX-refurbished/128gb-noir
    //                              /fr/apple-ipad-2025-11-wifi
    const html = doc.body?.innerHTML ?? "";
    const linkRegex = /\/fr\/apple-(?:iphone|ipad|airpods?|watch)[a-z0-9-]*(?:\/[a-z0-9-]+)?/gi;
    const seen = new Set<string>();
    const ids: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[0];
      if (seen.has(href)) continue;
      seen.add(href);
      ids.push(href);
    }

    // Pour chaque lien, retrouver une image / titre depuis les <a>
    const offers: CapturedOffer[] = [];
    for (const href of ids.slice(0, limit * 3)) {
      if (offers.length >= limit) break;
      const anchors = Array.from(
        doc.querySelectorAll<HTMLAnchorElement>(`a[href="${href}"]`)
      );
      if (anchors.length === 0) continue;

      let title = "";
      for (const a of anchors) {
        const text = (a.textContent ?? "").trim();
        if (text.length > title.length && text.length < 200) title = text;
      }
      if (!title) {
        for (const a of anchors) {
          const img = a.querySelector<HTMLImageElement>("img");
          if (img?.alt && img.alt.length > 5) {
            title = img.alt;
            break;
          }
        }
      }
      if (!title) continue;

      const img = anchors[0].querySelector<HTMLImageElement>("img");
      const image_url = img?.src ?? undefined;

      const isRefurb = /refurbished/i.test(href) || /refurbished|reconditionn/i.test(title);

      offers.push({
        title,
        price_cents: 0, // à enrichir
        currency: "EUR",
        condition: isRefurb ? "grade_a" : "new",
        url: href.startsWith("http") ? href : `https://gomibo.be${href}`,
        image_url,
        stock_status: "unknown",
        captured_host: "gomibo.be",
        raw_specs: {
          is_refurbished: isRefurb,
          needs_price_enrichment: true,
          from_gomibo_list: true,
        },
      });
    }

    console.log(`[Leazr][gomibo] ${offers.length} liens extraits (prix à enrichir)`);
    return offers;
  },
};

/** Extrait un Product depuis le premier JSON-LD Product trouvé */
function extractJsonLdProduct(doc: Document): { name: string; price_tvac: number; image_url?: string } | null {
  const scripts = doc.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
  for (const s of Array.from(scripts)) {
    try {
      const d = JSON.parse(s.textContent ?? "");
      if (d?.["@type"] !== "Product") continue;
      const offers = Array.isArray(d.offers) ? d.offers[0] : d.offers;
      if (!offers?.price) continue;
      const name = String(d.name ?? "");
      if (!name) continue;
      const image = d.image;
      const image_url =
        typeof image === "string"
          ? image
          : Array.isArray(image)
          ? typeof image[0] === "string"
            ? image[0]
            : image[0]?.url
          : undefined;
      return {
        name,
        price_tvac: Math.round(parseFloat(String(offers.price)) * 100),
        image_url,
      };
    } catch { /* skip */ }
  }
  return null;
}

/**
 * Enrichit une offre Gomibo en fetchant sa page détail et en extrayant
 * le prix depuis le JSON-LD Product (appelée par l'offscreen).
 */
export function enrichGomiboPriceFromDetail(html: string): { price_cents: number | null; source: string } {
  const scripts = Array.from(html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi));
  for (const m of scripts) {
    try {
      const d = JSON.parse(m[1]);
      if (d?.["@type"] !== "Product") continue;
      const offers = Array.isArray(d.offers) ? d.offers[0] : d.offers;
      if (!offers?.price) continue;
      const tvac = parseFloat(String(offers.price));
      if (isNaN(tvac) || tvac <= 0) continue;
      return {
        price_cents: Math.round((tvac / 1.21) * 100),
        source: "json-ld Product/1.21",
      };
    } catch { /* skip */ }
  }
  return { price_cents: null, source: "none" };
}
