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
    const normalized = query.trim().toLowerCase();

    // Produits Apple : la recherche libre Coolblue est très bruitée. On redirige
    // vers la page catégorie filtrée qui est bien plus pertinente.
    const appleCategoryUrl = detectAppleCategory(normalized);
    if (appleCategoryUrl) return appleCategoryUrl;

    const q = encodeURIComponent(query.trim());
    return `https://www.coolblue.be/fr/zoeken?query=${q}`;
  },

  extractSearchResults: (doc, url, limit = 5): CapturedOffer[] => {
    // Récupérer la query depuis l'URL pour pouvoir filtrer les résultats par pertinence
    const query = decodeURIComponent(url.searchParams.get("query") ?? "");

    // ═══ Stratégie 1 : JSON-LD ItemList (le plus fiable) ═══
    const fromJsonLd = extractFromJsonLdItemList(doc, limit * 4); // on sur-récupère pour filtrer ensuite
    if (fromJsonLd.length > 0) {
      const filtered = filterByRelevance(fromJsonLd, query).slice(0, limit);
      console.log(
        `[Leazr][coolblue] ${filtered.length}/${fromJsonLd.length} offres pertinentes via JSON-LD`
      );
      return filtered;
    }

    // ═══ Stratégie 2 : fallback DOM cards ═══
    const cardSelectors = [
      '[data-testid="product-card"]',
      "article[data-product-id]",
      ".product-card",
      '[class*="product-card"]',
    ];

    let cards: Element[] = [];
    for (const sel of cardSelectors) {
      const found = Array.from(doc.querySelectorAll(sel));
      if (found.length > 0) {
        cards = found;
        break;
      }
    }

    // Fallback liens
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
          let parent: Element | null = a;
          for (let i = 0; i < 4; i++) {
            parent = parent?.parentElement ?? null;
            if (!parent) break;
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
        if (!offers.some((o) => o.url === offer.url)) offers.push(offer);
      }
      if (offers.length >= limit) break;
    }

    console.log(`[Leazr][coolblue] ${offers.length}/${cards.length} offres via DOM fallback`);
    return offers;
  },
};

/**
 * Détecte les produits Apple populaires dans la query et renvoie l'URL de la
 * page catégorie correspondante (bien plus pertinente que /zoeken).
 *
 * Les pages catégorie Coolblue permettent d'ajouter des filtres via query params
 * (ex: ?processor=apple-m5). On ne les ajoute pas ici (difficile à généraliser),
 * on laisse le filtre de pertinence client s'en charger.
 */
function detectAppleCategory(q: string): string | null {
  const clean = q.replace(/[éèêë]/g, "e").replace(/\s+/g, " ").trim();

  // MacBook Air
  if (/\bmacbook\s*air\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/macbook-air";
  }
  // MacBook (Pro ou générique) — /fr/macbook-pro ne renvoie pas 200, on prend
  // la page générale /fr/apple-macbook qui contient tous les MacBook
  if (/\bmacbook\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/apple-macbook";
  }
  // iPhone
  if (/\biphone\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/smartphones/apple-iphone";
  }
  // iPad (Pro, Air, ou générique) — on laisse le filtre de pertinence trier
  if (/\bipad\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/tablettes/apple-ipad";
  }
  // Apple Watch
  if (/\bapple\s*watch\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/apple-watch";
  }
  // AirPods
  if (/\bairpods\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/ecouteurs/apple";
  }

  return null;
}

/**
 * Filtre les offres pour ne garder que celles dont le titre contient
 * les tokens significatifs de la query (taille > 2, excluant les stopwords).
 *
 * Règle : on garde une offre si au moins la moitié des tokens "importants"
 * de la query est présente dans le titre. Pour des requêtes courtes (1-2 mots
 * importants), tous doivent matcher.
 */
function filterByRelevance(offers: CapturedOffer[], query: string): CapturedOffer[] {
  if (!query.trim()) return offers;

  const STOPWORDS = new Set([
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "a", "au",
    "en", "pour", "avec", "sans", "pro", "the", "and", "or", "of", "in", "with",
  ]);

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // enlever accents
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t));

  const queryTokens = normalize(query);
  if (queryTokens.length === 0) return offers;

  // Seuil minimal de tokens à matcher
  const minRequired = queryTokens.length <= 2 ? queryTokens.length : Math.ceil(queryTokens.length / 2);

  const scored = offers
    .map((offer) => {
      const titleTokens = new Set(normalize(offer.title + " " + (offer.brand ?? "")));
      const matched = queryTokens.filter((t) => {
        // Match exact OU substring pour les modèles type "m5"
        if (titleTokens.has(t)) return true;
        for (const tt of titleTokens) {
          if (tt.includes(t) || t.includes(tt)) return true;
        }
        return false;
      });
      return { offer, score: matched.length };
    })
    .filter((x) => x.score >= minRequired);

  // Trier par score décroissant puis garder l'ordre initial pour égalité
  scored.sort((a, b) => b.score - a.score);

  return scored.map((x) => x.offer);
}

/** Extrait les offres depuis le JSON-LD ItemList (Schema.org) */
function extractFromJsonLdItemList(doc: Document, limit: number): CapturedOffer[] {
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

        // item peut être soit un Product direct, soit un ListItem wrappant un Product
        const product =
          item?.["@type"] === "Product"
            ? item
            : item?.item && item.item["@type"] === "Product"
            ? item.item
            : null;
        if (!product) continue;

        const offer = productToOffer(product);
        if (offer && !offers.some((o) => o.url === offer.url)) {
          offers.push(offer);
        }
      }
    } catch {
      // JSON invalide, on skip
    }
  }

  return offers;
}

/** Cherche récursivement un ItemList dans un objet JSON-LD (gère @graph, arrays, etc.) */
function findItemList(data: unknown): any {
  if (!data || typeof data !== "object") return null;
  const d = data as any;
  if (d["@type"] === "ItemList" && Array.isArray(d.itemListElement)) return d;
  if (Array.isArray(d)) {
    for (const item of d) {
      const found = findItemList(item);
      if (found) return found;
    }
  }
  if (Array.isArray(d["@graph"])) {
    for (const item of d["@graph"]) {
      const found = findItemList(item);
      if (found) return found;
    }
  }
  return null;
}

/** Convertit un Product Schema.org en CapturedOffer */
function productToOffer(product: any): CapturedOffer | null {
  const name = product.name;
  const url = product["@id"] || product.url;
  if (!name || !url) return null;

  // Image : peut être string, tableau, ou objet {url}
  let image_url: string | undefined;
  const img = product.image;
  if (typeof img === "string") image_url = img;
  else if (Array.isArray(img) && img.length > 0) {
    image_url = typeof img[0] === "string" ? img[0] : img[0]?.url;
  } else if (img?.url) image_url = img.url;

  // Offer : soit direct, soit dans un array, soit AggregateOffer avec lowPrice
  const offers = product.offers;
  let price_cents: number | undefined;
  let availability: string | undefined;
  let itemCondition: string | undefined;
  if (offers) {
    if (offers["@type"] === "AggregateOffer") {
      const lp = offers.lowPrice ?? offers.price;
      if (lp !== undefined) price_cents = Math.round(parseFloat(String(lp)) * 100);
      availability = offers.availability;
    } else if (Array.isArray(offers) && offers.length > 0) {
      const o = offers[0];
      if (o.price !== undefined) price_cents = Math.round(parseFloat(String(o.price)) * 100);
      availability = o.availability;
      itemCondition = o.itemCondition;
    } else {
      if (offers.price !== undefined) price_cents = Math.round(parseFloat(String(offers.price)) * 100);
      availability = offers.availability;
      itemCondition = offers.itemCondition;
    }
  }

  if (!price_cents || price_cents <= 0) return null;

  // Brand
  let brand: string | undefined;
  if (typeof product.brand === "string") brand = product.brand;
  else if (product.brand?.name) brand = product.brand.name;

  // Stock status
  const stock_status =
    availability && /InStock|in_stock/i.test(availability)
      ? "in_stock"
      : availability && /OutOfStock/i.test(availability)
      ? "out_of_stock"
      : "unknown";

  // Condition
  const isDeuxiemeChance = /deuxieme-chance|tweedekans/i.test(url);
  const condition =
    isDeuxiemeChance ||
    (itemCondition && /Refurbished|Used/i.test(itemCondition))
      ? "grade_a"
      : "new";

  return {
    title: String(name),
    brand,
    price_cents,
    currency: "EUR",
    condition,
    url: String(url),
    image_url,
    stock_status,
    captured_host: "www.coolblue.be",
    raw_specs: {
      is_deuxieme_chance: isDeuxiemeChance,
      from_json_ld: true,
      availability,
      itemCondition,
    },
  };
}

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
