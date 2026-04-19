/**
 * Adapter Mediamarkt BE — priorité à l'outlet (reconditionné/retour/ouverture boîte)
 *   - outlet.mediamarkt.be : OpenCart, prix visibles en SSR
 *   - www.mediamarkt.be : JSON-LD ItemList + Product sur la recherche
 *
 * iTakecare cherche du reconditionné, donc l'outlet est prioritaire.
 * Fallback sur le store principal si l'outlet n'a rien de pertinent.
 */
import type { SiteAdapter, CapturedOffer, AdapterResult } from "../../lib/types";
import {
  firstText,
  firstAttr,
  parsePriceCents,
  jsonLdProduct,
} from "../../lib/parse-helpers";

export const mediamarktAdapter: SiteAdapter = {
  name: "mediamarkt",
  key: "mediamarkt",
  displayName: "Mediamarkt BE",

  matches: (url) => /(^|\.)mediamarkt\.be$/.test(url.hostname),

  isProductPage: (_doc, url) => {
    if (url.hostname === "outlet.mediamarkt.be") {
      return /route=product\/product/.test(url.search);
    }
    return /\/fr\/product\//.test(url.pathname);
  },

  extract: (doc, url): AdapterResult => {
    const jld = jsonLdProduct(doc);
    const title = jld?.name ?? firstText(doc, ["h1", "h1.product-name", '[itemprop="name"]']);
    if (!title) return { ok: false, reason: "Titre introuvable" };

    const price_cents_tvac = jld?.price_cents ?? parsePriceCents(
      firstText(doc, [
        '[data-test="product-price"]',
        ".product-price__current",
        ".product-price",
        '[itemprop="price"]',
      ])
    );
    if (!price_cents_tvac) return { ok: false, reason: "Prix introuvable" };

    const image_url = jld?.image ?? firstAttr(doc, ["img.product-image", 'img[itemprop="image"]'], "src") ?? undefined;

    const isOutlet = url.hostname === "outlet.mediamarkt.be";
    return {
      ok: true,
      offer: {
        title: title.trim(),
        brand: jld?.brand,
        price_cents: Math.round(price_cents_tvac / 1.21),
        currency: "EUR",
        condition: isOutlet ? "grade_a" : "new",
        url: url.href,
        image_url: image_url ?? undefined,
        stock_status: "unknown",
        captured_host: url.hostname,
        raw_specs: {
          is_outlet: isOutlet,
          price_cents_tvac,
          vat_excluded: true,
        },
      },
    };
  },

  buildSearchUrls: (query: string) => {
    const q = encodeURIComponent(query.trim());
    return [
      // Priorité 1 : outlet (reconditionné, retours, ouvertures boîte) → déjà moins cher
      `https://outlet.mediamarkt.be/index.php?route=product/search&search=${q}`,
      // Priorité 2 : store principal (neuf, JSON-LD ItemList)
      `https://www.mediamarkt.be/fr/search.html?query=${q}`,
    ];
  },

  extractSearchResults: (doc, url, limit = 5): CapturedOffer[] => {
    const isOutlet = url.hostname === "outlet.mediamarkt.be";
    return isOutlet
      ? extractOutletResults(doc, limit)
      : extractMainStoreResults(doc, limit);
  },
};

/** Parse les résultats du site outlet (OpenCart, pas de JSON-LD ItemList) */
function extractOutletResults(doc: Document, limit: number): CapturedOffer[] {
  // Cartes Bootstrap : <div class="card h-100">...</div> dans .product-grid
  const cards = Array.from(doc.querySelectorAll(".product-grid .card, div.card.h-100"));
  const offers: CapturedOffer[] = [];

  for (const card of cards.slice(0, limit * 3)) {
    if (offers.length >= limit) break;

    const link = card.querySelector<HTMLAnchorElement>(
      'a[href*="route=product/product"]'
    );
    if (!link) continue;

    const href = link.href || link.getAttribute("href") || "";
    // OpenCart encode les & dans les HTML, les corriger
    const url = href.replace(/&amp;/g, "&");
    if (!url) continue;

    const title =
      link.textContent?.trim() ||
      card.querySelector<HTMLHeadingElement>(".card-title")?.textContent?.trim() ||
      card.querySelector<HTMLImageElement>("img")?.alt?.trim();
    if (!title) continue;

    // Prix : chercher le plus gros prix non barré de la card
    const price_cents_tvac = findPriceInCard(card);
    if (!price_cents_tvac) continue;

    const img = card.querySelector<HTMLImageElement>("img");
    const image_url = img?.src ?? undefined;

    offers.push({
      title,
      price_cents: Math.round(price_cents_tvac / 1.21),
      currency: "EUR",
      condition: "grade_a", // outlet = reconditionné/retour
      url,
      image_url,
      stock_status: "unknown",
      captured_host: "outlet.mediamarkt.be",
      raw_specs: {
        is_outlet: true,
        price_cents_tvac,
        vat_excluded: true,
      },
    });
  }

  console.log(`[Leazr][mediamarkt/outlet] ${offers.length} offres extraites`);
  return offers;
}

/** Parse les résultats de la recherche du store principal (JSON-LD ItemList) */
function extractMainStoreResults(doc: Document, limit: number): CapturedOffer[] {
  const scripts = doc.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
  const offers: CapturedOffer[] = [];

  for (const script of Array.from(scripts)) {
    if (offers.length >= limit) break;
    try {
      const data = JSON.parse(script.textContent ?? "");
      const itemList = findItemList(data);
      if (!itemList) continue;

      const items = Array.isArray(itemList.itemListElement) ? itemList.itemListElement : [];
      for (const item of items) {
        if (offers.length >= limit) break;
        const product =
          item?.["@type"] === "Product"
            ? item
            : item?.item && item.item["@type"] === "Product"
            ? item.item
            : null;
        if (!product) continue;

        const o = mainStoreProductToOffer(product);
        if (o && !offers.some((x) => x.url === o.url)) offers.push(o);
      }
    } catch { /* JSON invalide, skip */ }
  }
  console.log(`[Leazr][mediamarkt/main] ${offers.length} offres extraites via JSON-LD`);
  return offers;
}

function mainStoreProductToOffer(product: any): CapturedOffer | null {
  const name = product.name;
  const url = product["@id"] || product.url;
  if (!name || !url) return null;

  let image_url: string | undefined;
  const img = product.image;
  if (typeof img === "string") image_url = img;
  else if (Array.isArray(img)) image_url = typeof img[0] === "string" ? img[0] : img[0]?.url;

  // Offer — MediaMarkt expose aussi TVAC
  const offers = product.offers;
  let price_tvac: number | undefined;
  let availability: string | undefined;
  if (offers) {
    const o = Array.isArray(offers) ? offers[0] : offers;
    if (o?.price !== undefined) price_tvac = Math.round(parseFloat(String(o.price)) * 100);
    availability = o?.availability;
  }
  if (!price_tvac) return null;

  return {
    title: String(name),
    brand: typeof product.brand === "string" ? product.brand : product.brand?.name,
    price_cents: Math.round(price_tvac / 1.21), // HT
    currency: "EUR",
    condition: "new",
    url: String(url),
    image_url,
    stock_status:
      availability && /InStock/i.test(availability)
        ? "in_stock"
        : availability && /OutOfStock/i.test(availability)
        ? "out_of_stock"
        : "unknown",
    captured_host: "www.mediamarkt.be",
    raw_specs: {
      from_json_ld: true,
      price_cents_tvac: price_tvac,
      vat_excluded: true,
    },
  };
}

function findItemList(data: unknown): any {
  if (!data || typeof data !== "object") return null;
  const d = data as any;
  if (d["@type"] === "ItemList" && Array.isArray(d.itemListElement)) return d;
  if (Array.isArray(d)) for (const x of d) { const r = findItemList(x); if (r) return r; }
  if (Array.isArray(d["@graph"])) for (const x of d["@graph"]) { const r = findItemList(x); if (r) return r; }
  return null;
}

/** Cherche le prix non-barré dans une card OpenCart */
function findPriceInCard(card: Element): number | null {
  const all = Array.from(card.querySelectorAll("*"));
  const candidates: Array<{ cents: number; fontSize: number }> = [];
  for (const el of all) {
    const directText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join("")
      .trim();
    if (!directText || !/€/.test(directText)) continue;
    if (directText.length > 30) continue;
    // Exclure prix barrés
    if (
      el.closest(
        "del, s, [class*='strikethrough'], [class*='line-through'], [class*='old-price'], [class*='was-price'], [class*='text-muted']"
      )
    )
      continue;
    if (typeof window !== "undefined") {
      const cs = window.getComputedStyle(el);
      if (/line-through/i.test(cs.textDecorationLine || cs.textDecoration || "")) continue;
    }
    const cents = parsePriceCents(directText);
    if (!cents) continue;
    const fs =
      typeof window !== "undefined" ? parseFloat(window.getComputedStyle(el).fontSize) : 0;
    candidates.push({ cents, fontSize: fs });
  }
  if (candidates.length === 0) return null;
  // Prendre le plus gros ou le plus petit selon la convention : chez OpenCart outlet,
  // le prix promo est généralement plus petit mais mis en évidence (rouge). On prend
  // le PLUS BAS non-barré (= prix outlet) pour être safe.
  candidates.sort((a, b) => a.cents - b.cents);
  return candidates[0].cents;
}
