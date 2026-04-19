/**
 * Adapter Coolblue (coolblue.be / coolblue.nl)
 *
 * Supporte :
 *  - Pages produit (extract)
 *  - Pages de recherche (extractSearchResults)
 */
import type { SiteAdapter, CapturedOffer, AdapterResult } from "../../lib/types";
import {
  firstText,
  firstAttr,
  parseDeliveryDays,
  parseStockStatus,
  parseCondition,
  jsonLdProduct,
  findMainPrice,
  parsePriceCents,
} from "../../lib/parse-helpers";

const PRODUCT_PATH_RE =
  /\/(produit|product|deuxieme-chance-produit|tweedekans-product|2ehands-product|seconde-main|refurbished|outlet)\/\d+/i;

export const coolblueAdapter: SiteAdapter = {
  name: "coolblue",
  key: "coolblue",
  displayName: "Coolblue",

  matches: (url) => /coolblue\.(be|nl|com)$/.test(url.hostname),

  isProductPage: (doc, url) => {
    if (PRODUCT_PATH_RE.test(url.pathname)) return true;
    if (jsonLdProduct(doc)) return true;
    const hasH1 = !!doc.querySelector("h1");
    const hasPrice =
      !!doc.querySelector('[class*="sales-price"]') ||
      !!doc.querySelector('[data-testid*="price"]') ||
      !!doc.querySelector('[class*="price"]');
    return hasH1 && hasPrice;
  },

  extract: (doc, url): AdapterResult => {
    const isDeuxiemeChance = /deuxieme-chance-produit|tweedekans-product|2ehands|seconde-main|outlet|refurbished/i.test(
      url.pathname
    );

    const jld = jsonLdProduct(doc);

    const title =
      jld?.name ??
      firstText(doc, [
        'h1[data-testid="product-title"]',
        'h1[data-testid="title"]',
        "h1.product-header__title",
        'h1[itemprop="name"]',
        "h1.js-product-header",
        "main h1",
        "h1",
      ]);

    if (!title) return { ok: false, reason: "Titre produit introuvable" };

    const priceResult = findMainPrice(doc, [
      '[data-testid="product-price"] .sales-price__current',
      '[data-testid="sales-price-current"]',
      ".js-product-page-main-sales-price .sales-price__current",
      ".product-header .sales-price__current",
    ]);

    const price_cents = priceResult.cents ?? jld?.price_cents ?? null;
    console.log(`[Leazr][coolblue] Prix: ${price_cents} cents (source: ${priceResult.source})`);

    if (!price_cents) return { ok: false, reason: "Prix introuvable" };

    const deliveryText = firstText(doc, [
      '[data-testid="delivery-promise"]',
      ".product-page__delivery",
      ".delivery-promise",
      '[class*="delivery"]',
    ]);
    const delivery = parseDeliveryDays(deliveryText);

    const stockText = firstText(doc, [
      '[data-testid="stock-status"]',
      ".product-page__stock",
      ".js-product-stock-info",
      '[class*="stock"]',
    ]);
    const stock_status = parseStockStatus(stockText ?? deliveryText ?? "");

    const conditionText = firstText(doc, [
      '[data-testid="product-condition"]',
      ".product-condition",
      '[class*="condition"]',
      '[class*="etat"]',
    ]);
    const condition = isDeuxiemeChance
      ? parseCondition(conditionText ?? "reconditionné") ?? "grade_a"
      : parseCondition(conditionText ?? "neuf") ?? "new";

    const image_url =
      jld?.image ??
      firstAttr(
        doc,
        [
          'img[data-testid="product-image"]',
          ".product-image img",
          'img[itemprop="image"]',
          'main img[src*="coolblue"]',
          'img[alt*="produit"]',
        ],
        "src"
      ) ??
      undefined;

    return {
      ok: true,
      offer: {
        title: title.trim(),
        brand: jld?.brand,
        price_cents,
        currency: "EUR",
        delivery_days_min: delivery.min,
        delivery_days_max: delivery.max,
        condition,
        url: url.href,
        image_url: image_url ?? undefined,
        stock_status,
        captured_host: url.hostname,
        raw_specs: { is_deuxieme_chance: isDeuxiemeChance },
      },
    };
  },

  buildSearchUrl: (query: string) => {
    const q = encodeURIComponent(query.trim());
    return `https://www.coolblue.be/fr/zoeken?query=${q}`;
  },

  extractSearchResults: (doc, _url, limit = 5): CapturedOffer[] => {
    // Trouver les cards de résultats
    const cardSelectors = [
      '[data-testid="product-card"]',
      '[data-testid*="product-card"]',
      "article[data-product-id]",
      ".product-card",
      '[class*="productCard"]',
      "[data-test-id='product-card']",
    ];

    let cards: Element[] = [];
    for (const sel of cardSelectors) {
      const found = Array.from(doc.querySelectorAll(sel));
      if (found.length > 0) {
        cards = found;
        break;
      }
    }

    // Fallback : déduire les cards depuis les liens vers /produit/ ou /deuxieme-chance-produit/
    if (cards.length === 0) {
      const links = Array.from(
        doc.querySelectorAll<HTMLAnchorElement>(
          'a[href*="/produit/"], a[href*="/deuxieme-chance-produit/"]'
        )
      );
      const seen = new Set<string>();
      cards = links
        .map((a): Element | null => {
          const href = a.getAttribute("href") ?? "";
          if (seen.has(href)) return null;
          seen.add(href);
          // Remonter jusqu'à un container de taille raisonnable
          let parent: Element | null = a;
          for (let i = 0; i < 4; i++) {
            parent = parent?.parentElement ?? null;
            if (!parent) break;
            // Heuristique : un container large qui contient un prix
            if (parent.querySelector('[class*="price"], [class*="sales-price"]')) {
              return parent;
            }
          }
          return a.parentElement;
        })
        .filter((x): x is Element => x !== null);
    }

    const offers: CapturedOffer[] = [];
    for (const card of cards.slice(0, limit * 3)) {
      const offer = extractCardOffer(card);
      if (offer) {
        // Éviter les doublons d'URL
        if (!offers.some((o) => o.url === offer.url)) offers.push(offer);
      }
      if (offers.length >= limit) break;
    }

    console.log(`[Leazr][coolblue] ${offers.length}/${cards.length} offres extraites (limit=${limit})`);
    return offers;
  },
};

/** Extrait une offre depuis une card de résultat de recherche */
function extractCardOffer(card: Element): CapturedOffer | null {
  // Titre
  const titleEl = card.querySelector(
    "h3, h2, [data-testid*='title'], [class*='product-card__title'], [class*='title']"
  );
  const title = titleEl?.textContent?.trim();
  if (!title) return null;

  // URL
  const link = card.querySelector<HTMLAnchorElement>(
    "a[href*='/produit/'], a[href*='/deuxieme-chance-produit/']"
  );
  const href = link?.href ?? link?.getAttribute("href") ?? "";
  if (!href) return null;
  const absoluteUrl = href.startsWith("http") ? href : `https://www.coolblue.be${href}`;

  // Prix : plus gros prix non-barré dans la card
  const price_cents = findPriceInElement(card);
  if (!price_cents) return null;

  // Image
  const img = card.querySelector<HTMLImageElement>("img");
  const image_url = img?.src ?? img?.getAttribute("data-src") ?? undefined;

  const isDeuxiemeChance = /deuxieme-chance|tweedekans/i.test(href);

  return {
    title,
    price_cents,
    currency: "EUR",
    condition: isDeuxiemeChance ? "grade_a" : "new",
    url: absoluteUrl,
    image_url,
    stock_status: "unknown",
    captured_host: "www.coolblue.be",
    raw_specs: { is_deuxieme_chance: isDeuxiemeChance, from_search_card: true },
  };
}

/** findMainPrice restreint à un subtree Element */
function findPriceInElement(root: Element): number | null {
  const all = Array.from(root.querySelectorAll("*"));
  const candidates: Array<{ cents: number; fontSize: number }> = [];
  for (const el of all) {
    const directText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join("")
      .trim();
    if (!directText || !/€|EUR/i.test(directText)) continue;
    if (directText.length > 30) continue;
    if (
      el.closest(
        "del, s, [class*='strikethrough'], [class*='line-through'], [class*='old-price'], [class*='was-price'], [class*='sales-price__previous'], [class*='previous-price']"
      )
    )
      continue;
    if (typeof window !== "undefined") {
      const cs = window.getComputedStyle(el);
      if (/line-through/i.test(cs.textDecorationLine || cs.textDecoration || "")) continue;
    }
    const cents = parsePriceCents(directText);
    if (!cents) continue;
    const fs = typeof window !== "undefined" ? parseFloat(window.getComputedStyle(el).fontSize) : 0;
    candidates.push({ cents, fontSize: fs });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.fontSize - a.fontSize);
  return candidates[0].cents;
}
