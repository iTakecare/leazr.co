/**
 * Deux adapters distincts Mediamarkt pour que l'user voie chaque source
 * indépendamment dans la modale :
 *   - mediamarkt_outlet (outlet.mediamarkt.be — reconditionné/retour)
 *   - mediamarkt_main (www.mediamarkt.be — neuf, JSON-LD ItemList)
 */
import type { SiteAdapter, CapturedOffer, AdapterResult } from "../../lib/types";
import {
  firstText,
  firstAttr,
  parsePriceCents,
  jsonLdProduct,
} from "../../lib/parse-helpers";
import { publicHealthCheck } from "../../lib/health-check";

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER 1 : outlet.mediamarkt.be (OpenCart, reconditionné/retour)
// ═══════════════════════════════════════════════════════════════════════════
export const mediamarktOutletAdapter: SiteAdapter = {
  name: "mediamarkt-outlet",
  key: "mediamarkt_outlet",
  displayName: "Mediamarkt Outlet",
  loginUrl: "https://outlet.mediamarkt.be/",
  checkConnection: () => publicHealthCheck("https://outlet.mediamarkt.be/"),

  matches: (url) => url.hostname === "outlet.mediamarkt.be",

  isProductPage: (_doc, url) => /route=product\/product/.test(url.search),

  extract: (doc, url): AdapterResult => {
    const title =
      firstText(doc, ["h1", ".product-title", "h1.product-name"]) ??
      doc.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
    if (!title) return { ok: false, reason: "Titre introuvable" };

    const price_cents_tvac = parsePriceCents(
      firstText(doc, [".price-new", ".product-price", "h2.price"])
    );
    if (!price_cents_tvac) return { ok: false, reason: "Prix introuvable" };

    const image_url =
      firstAttr(doc, ["#image-product", "img.product-image"], "src") ?? undefined;

    return {
      ok: true,
      offer: {
        title: title.trim(),
        price_cents: Math.round(price_cents_tvac / 1.21),
        currency: "EUR",
        condition: "grade_a",
        url: url.href,
        image_url: image_url ?? undefined,
        stock_status: "unknown",
        captured_host: url.hostname,
        raw_specs: { is_outlet: true, price_cents_tvac, vat_excluded: true },
      },
    };
  },

  buildSearchUrls: (query: string) => {
    const q = encodeURIComponent(query.trim());
    return [`https://outlet.mediamarkt.be/index.php?route=product/search&search=${q}`];
  },

  extractSearchResults: (doc, _url, limit = 5): CapturedOffer[] => {
    const cards = Array.from(doc.querySelectorAll(".product-grid .card, div.card.h-100"));
    const offers: CapturedOffer[] = [];

    for (const card of cards.slice(0, limit * 3)) {
      if (offers.length >= limit) break;

      const link = card.querySelector<HTMLAnchorElement>(
        'a[href*="route=product/product"]'
      );
      if (!link) continue;

      // getAttribute pour avoir l'URL brute (évite la résolution
      // chrome-extension:// dans un DOMParser hors navigateur)
      const rawHref = link.getAttribute("href") || "";
      const decoded = rawHref.replace(/&amp;/g, "&");
      const url = decoded.startsWith("http")
        ? decoded
        : `https://outlet.mediamarkt.be${decoded.startsWith("/") ? "" : "/"}${decoded}`;
      if (!url) continue;

      const title =
        link.textContent?.trim() ||
        card.querySelector<HTMLElement>(".card-title")?.textContent?.trim() ||
        card.querySelector<HTMLImageElement>("img")?.alt?.trim();
      if (!title) continue;

      const price_cents_tvac = findPriceInOutletCard(card);
      if (!price_cents_tvac) continue;

      const img = card.querySelector<HTMLImageElement>("img");
      const image_url = img?.src ?? undefined;

      offers.push({
        title,
        price_cents: Math.round(price_cents_tvac / 1.21),
        currency: "EUR",
        condition: "grade_a",
        url,
        image_url,
        stock_status: "unknown",
        captured_host: "outlet.mediamarkt.be",
        raw_specs: { is_outlet: true, price_cents_tvac, vat_excluded: true },
      });
    }
    console.log(`[Leazr][mediamarkt/outlet] ${offers.length} offres extraites`);
    return offers;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER 2 : www.mediamarkt.be (neuf, JSON-LD ItemList)
// ═══════════════════════════════════════════════════════════════════════════
export const mediamarktMainAdapter: SiteAdapter = {
  name: "mediamarkt",
  key: "mediamarkt",
  displayName: "Mediamarkt BE",
  loginUrl: "https://www.mediamarkt.be/fr",
  checkConnection: () => publicHealthCheck("https://www.mediamarkt.be/fr"),

  matches: (url) => url.hostname === "www.mediamarkt.be",

  isProductPage: (_doc, url) => /\/fr\/product\//.test(url.pathname),

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

    return {
      ok: true,
      offer: {
        title: title.trim(),
        brand: jld?.brand,
        price_cents: Math.round(price_cents_tvac / 1.21),
        currency: "EUR",
        condition: "new",
        url: url.href,
        image_url: image_url ?? undefined,
        stock_status: "unknown",
        captured_host: url.hostname,
        raw_specs: { price_cents_tvac, vat_excluded: true },
      },
    };
  },

  buildSearchUrls: (query: string) => {
    const q = encodeURIComponent(query.trim());
    return [`https://www.mediamarkt.be/fr/search.html?query=${q}`];
  },

  extractSearchResults: (doc, _url, limit = 5): CapturedOffer[] => {
    const scripts = doc.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
    const offers: CapturedOffer[] = [];
    const seen = new Set<string>();

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
              : item?.item?.["@type"] === "Product"
              ? item.item
              : null;
          if (!product) continue;
          const o = mainProductToOffer(product);
          if (o && !seen.has(o.url)) {
            seen.add(o.url);
            offers.push(o);
          }
        }
      } catch { /* skip */ }
    }
    console.log(`[Leazr][mediamarkt/main] ${offers.length} offres extraites via JSON-LD`);
    return offers;
  },
};

function mainProductToOffer(product: any): CapturedOffer | null {
  const name = product.name;
  const url = product["@id"] || product.url;
  if (!name || !url) return null;

  let image_url: string | undefined;
  const img = product.image;
  if (typeof img === "string") image_url = img;
  else if (Array.isArray(img)) image_url = typeof img[0] === "string" ? img[0] : img[0]?.url;

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
    price_cents: Math.round(price_tvac / 1.21),
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
    raw_specs: { from_json_ld: true, price_cents_tvac: price_tvac, vat_excluded: true },
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

function findPriceInOutletCard(card: Element): number | null {
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
  // Sur OpenCart outlet, le prix promo (en rouge/lead) est celui qu'on veut
  // — typiquement le plus PETIT non-barré.
  candidates.sort((a, b) => a.cents - b.cents);
  return candidates[0].cents;
}
