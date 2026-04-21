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
  filterOffersByProductType,
  filterOffersByRelevance,
} from "../../lib/parse-helpers";
import { publicHealthCheck } from "../../lib/health-check";

const PRODUCT_PATH_RE =
  /\/(produit|product|deuxieme-chance-produit|tweedekans-product|2ehands-product|seconde-main|refurbished|outlet)\/\d+/i;

export const coolblueAdapter: SiteAdapter = {
  name: "coolblue",
  key: "coolblue",
  displayName: "Coolblue",
  loginUrl: "https://www.coolblue.be/fr",
  checkConnection: () => publicHealthCheck("https://www.coolblue.be/fr", { expectString: "coolblue" }),

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

  buildSearchUrls: (query: string) => {
    const normalized = query.trim().toLowerCase();

    const candidates: string[] = [];

    // Priorité absolue : page catégorie "Deuxième Chance"
    // iTakecare leases refurbished only — NE PAS fallback vers du neuf,
    // c'est contre-productif (l'admin devra de toute façon chercher du refurb).
    const refurbCategoryUrl = detectAppleRefurbishedCategory(normalized);
    if (refurbCategoryUrl) {
      candidates.push(refurbCategoryUrl);
      // Pour les Apple, on reste strictement sur le reconditionné.
      return candidates;
    }

    // Pour les queries non-Apple, on utilise la recherche générale qui inclut
    // probablement aussi les deuxième chance quand ils existent
    const q = encodeURIComponent(query.trim());
    candidates.push(`https://www.coolblue.be/fr/zoeken?query=${q}`);
    return candidates;
  },

  extractSearchResults: (doc, url, limit = 5): CapturedOffer[] => {
    // Récupérer la query depuis l'URL pour pouvoir filtrer les résultats par pertinence
    const query = decodeURIComponent(url.searchParams.get("query") ?? "");

    // ═══ Stratégie 0 : page "Deuxième Chance" catégorie ═══
    // Coolblue ne met PAS les prix dans le SSR de cette page (React Server
    // Components chargés en JS). On extrait titre + URL + image + ID et on
    // laisse l'orchestrator enrichir les prix via les pages détail.
    if (/\/deuxieme-chance\//.test(url.pathname)) {
      // Extraire TOUS les produits de la page refurb — la page peut contenir
      // 100+ iPhones/MacBooks avec les variantes récentes éparpillées. Le
      // filtrage par type/pertinence est ensuite fait par l'orchestrator qui
      // a la query complète. Sans ça on perd les iPhone 17 Pro Max au profit
      // des iPhone 13 qui s'affichent en premier.
      const allOffers = extractRefurbishedListCards(doc, 200);
      // Pré-filtre local via les helpers partagés (type produit + génération +
      // accessoires exclus). Ça évite de fetch 100 pages détail pour des
      // iPhones/covers qui seront rejetés par l'orchestrator de toute façon.
      const typeFiltered = filterOffersByProductType(allOffers, query);
      const relevanceFiltered = filterOffersByRelevance(typeFiltered, query);
      console.log(
        `[Leazr][coolblue] refurb: raw=${allOffers.length}, type=${typeFiltered.length}, relevant=${relevanceFiltered.length}`
      );
      // Limiter le nombre d'enrichissements à un nombre raisonnable (20) pour
      // éviter de surcharger en fetches. L'orchestrator ne gardera que les
      // `limit` meilleures à la fin.
      return relevanceFiltered.slice(0, 20);
    }

    // ═══ Stratégie 1 : JSON-LD ItemList (le plus fiable, page /zoeken) ═══
    const fromJsonLd = extractFromJsonLdItemList(doc, limit * 4);
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
/**
 * Retourne l'URL Coolblue Deuxième Chance correspondant au produit Apple
 * demandé, ou null s'il n'y a pas de page deuxieme chance dédiée.
 * URLs vérifiées sur coolblue.be/fr.
 */
function detectAppleRefurbishedCategory(q: string): string | null {
  const clean = q.replace(/[éèêë]/g, "e").replace(/\s+/g, " ").trim();

  // MacBook Pro (page dédiée)
  if (/\bmacbook\s*pro\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/deuxieme-chance/apple-macbook-pro";
  }
  // MacBook Air (page dédiée)
  if (/\bmacbook\s*air\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/deuxieme-chance/apple-macbook-air";
  }
  // MacBook générique
  if (/\bmacbook\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/deuxieme-chance/apple-macbook";
  }
  // iPhone
  if (/\biphone\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/deuxieme-chance/apple-iphone";
  }
  // iPad (toutes variantes)
  if (/\bipad\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/deuxieme-chance/apple-ipad";
  }
  // Apple Watch
  if (/\bapple\s*watch\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/deuxieme-chance/apple-watch";
  }
  // AirPods
  if (/\bairpods\b/i.test(clean)) {
    return "https://www.coolblue.be/fr/deuxieme-chance/apple-airpods";
  }

  return null;
}

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

  // Stopwords : mots à IGNORER dans la query (articles, conjonctions)
  // On EXCLUT volontairement : 'pro', 'air', 'max', 'mini' — ce sont des
  // discriminants de gamme Apple (MacBook Pro ≠ MacBook Air !).
  const STOPWORDS = new Set([
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou",
    "en", "pour", "avec", "sans", "the", "and", "or", "of", "in", "with",
  ]);

  // Mots TOUJOURS requis s'ils apparaissent dans la query (ne peuvent pas être
  // match par substring — un MacBook Pro ne doit jamais matcher "Air").
  const EXCLUSIVE_MODIFIERS = new Set(["pro", "air", "max", "mini", "ultra", "plus"]);

  const normalize = (s: string): string[] =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  const queryTokens = normalize(query);
  if (queryTokens.length === 0) return offers;

  // Les tokens exclusifs dans la query doivent impérativement apparaître dans le titre
  const requiredExclusives = queryTokens.filter((t) => EXCLUSIVE_MODIFIERS.has(t));

  // Seuil minimal de tokens ordinaires à matcher
  const nonExclusiveTokens = queryTokens.filter((t) => !EXCLUSIVE_MODIFIERS.has(t));
  const minRequired =
    nonExclusiveTokens.length <= 2
      ? nonExclusiveTokens.length
      : Math.ceil(nonExclusiveTokens.length / 2);

  // Anti-modifier : si la query dit "Pro", on rejette les titres qui contiennent
  // "Air" / "Mini" / "Max" (et vice-versa)
  const OPPOSITE_MODIFIERS: Record<string, string[]> = {
    pro: ["air", "mini"],
    air: ["pro", "mini", "max"],
    mini: ["pro", "air", "max", "ultra"],
    max: ["air", "mini"],
    ultra: ["mini"],
  };
  const forbiddenInTitle = new Set<string>();
  for (const exc of requiredExclusives) {
    for (const opp of OPPOSITE_MODIFIERS[exc] ?? []) forbiddenInTitle.add(opp);
  }

  const scored = offers
    .map((offer) => {
      const titleTokensArr = normalize(offer.title + " " + (offer.brand ?? ""));
      const titleTokens = new Set(titleTokensArr);

      // Rejet si un modificateur opposé apparaît dans le titre
      for (const forbidden of forbiddenInTitle) {
        if (titleTokens.has(forbidden)) return { offer, score: -1 };
      }

      // Tous les modificateurs exclusifs de la query doivent être présents dans le titre
      for (const exc of requiredExclusives) {
        if (!titleTokens.has(exc)) return { offer, score: -1 };
      }

      // Compter les matches des tokens non-exclusifs
      const matched = nonExclusiveTokens.filter((t) => {
        if (titleTokens.has(t)) return true;
        // Substring autorisé pour les codes modèles type "m5", "14"
        for (const tt of titleTokens) {
          if (tt === t) return true;
          // Substring SEULEMENT si le token query est court (≤ 3) pour éviter
          // 'macbook' matchant sur 'book'
          if (t.length <= 3 && tt.includes(t)) return true;
          if (t.length > 3 && tt.includes(t) && t.length >= tt.length - 2) return true;
        }
        return false;
      });

      return { offer, score: matched.length };
    })
    .filter((x) => x.score >= minRequired);

  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.offer);
}

/**
 * Extraction spécifique aux pages /fr/deuxieme-chance/<category> :
 * - pas de JSON-LD ItemList
 * - pas de prix en SSR (hydratés en JS)
 * → on récupère titre + url + image + id et on marque price_cents = 0
 *   avec raw_specs.needs_price_enrichment = true.
 */
function extractRefurbishedListCards(doc: Document, limit: number): CapturedOffer[] {
  const html = doc.body?.innerHTML ?? "";
  // Récupérer les IDs produit uniques. Coolblue utilise plusieurs patterns :
  //  - /fr/produit/{id}               → page produit standard (lien principal des cards refurb)
  //  - /fr/produit-deuxieme-chance/{id} → page variante refurb (sous-lien "Deuxième Chance intéressant")
  //  - /fr/deuxieme-chance-produit/{id} → variante legacy
  // Si on ne capture QUE /produit-deuxieme-chance, on rate 11 des 12 cards de la
  // page catégorie (les cards principales linkent vers /produit/).
  const idRegex = /\/fr\/(?:produit(?:-deuxieme-chance)?|deuxieme-chance-produit)\/(\d+)/g;
  const seen = new Set<string>();
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = idRegex.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      ids.push(m[1]);
    }
  }
  console.log(`[Leazr][coolblue] refurb: ${ids.length} IDs uniques extraits du HTML`);

  const offers: CapturedOffer[] = [];
  for (const id of ids.slice(0, limit * 3)) {
    if (offers.length >= limit) break;

    // Pour chaque ID, chercher l'anchor + le texte titre + l'image
    // Accepter tous les patterns de lien pour cet ID.
    const anchors = Array.from(
      doc.querySelectorAll<HTMLAnchorElement>(
        `a[href*="/fr/produit/${id}"], a[href*="/fr/produit-deuxieme-chance/${id}"], a[href*="/fr/deuxieme-chance-produit/${id}"]`
      )
    );
    if (anchors.length === 0) continue;

    // Titre : chercher le plus long texte dans les anchors ou leurs parents
    let title = "";
    for (const a of anchors) {
      const text = (a.textContent ?? "").trim();
      if (text.length > title.length && text.length < 200) title = text;
    }
    // Fallback : alt de l'image dans la card
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

    // Image : premier <img> trouvé dans les anchors
    let image_url: string | undefined;
    for (const a of anchors) {
      const img = a.querySelector<HTMLImageElement>("img");
      if (img?.src) {
        image_url = img.src;
        break;
      }
    }

    offers.push({
      title,
      price_cents: 0, // à enrichir
      currency: "EUR",
      condition: "grade_a", // toutes les pages /deuxieme-chance/ = reconditionné
      url: `https://www.coolblue.be/fr/produit-deuxieme-chance/${id}`,
      image_url,
      stock_status: "unknown",
      captured_host: "www.coolblue.be",
      raw_specs: {
        is_deuxieme_chance: true,
        from_refurb_list: true,
        needs_price_enrichment: true,
        product_id: id,
      },
    });
  }

  return offers;
}

/**
 * Enrichit une offre en fetchant sa page détail et en extrayant le prix HTVA
 * depuis le payload React Server Components Next.js.
 *
 * iTakecare fait du leasing B2B → on veut toujours le prix HORS TVA.
 * Coolblue expose les deux dans son RSC :
 *   - "priceExcludingVat":1522.3140495867767  (HTVA, précis)
 *   - "includingVat":1842                     (TVAC, arrondi)
 *   - "excludingVat":1522.3140495867767       (HTVA dans salesPrice)
 * On préfère la valeur HTVA directement. Si seulement TVAC dispo → /1.21
 * (TVA belge standard).
 */
export function enrichCoolbluePriceFromDetail(html: string):
  | { price_cents: number; source: string }
  | { price_cents: null } {
  // Priorité 1 : priceExcludingVat dans currentPrice RSC
  const m1 = html.match(/"priceExcludingVat":(\d+(?:\.\d+)?)/);
  if (m1) {
    return {
      price_cents: Math.round(parseFloat(m1[1]) * 100),
      source: "priceExcludingVat",
    };
  }
  // Priorité 2 : excludingVat dans salesPrice
  const m2 = html.match(/"excludingVat":(\d+(?:\.\d+)?)/);
  if (m2) {
    return {
      price_cents: Math.round(parseFloat(m2[1]) * 100),
      source: "excludingVat",
    };
  }
  // Priorité 3 : includingVat → divisé par 1.21 (TVA BE 21%)
  const m3 = html.match(/"includingVat":(\d+(?:\.\d+)?)/);
  if (m3) {
    const tvac = parseFloat(m3[1]);
    return {
      price_cents: Math.round((tvac / 1.21) * 100),
      source: "includingVat/1.21",
    };
  }
  // Priorité 4 : "price":NNNN (TVAC) — même fallback via /1.21
  const m4 = html.match(/"currentPrice":\[[^\]]*"price":(\d+(?:\.\d+)?)/);
  if (m4) {
    const tvac = parseFloat(m4[1]);
    return {
      price_cents: Math.round((tvac / 1.21) * 100),
      source: "currentPrice.price/1.21",
    };
  }
  // Priorité 5 : HTML rendu "€ <!-- -->1.842<!-- -->,-" (TVAC → /1.21)
  const m5 = html.match(/€\s*(?:<!--[^>]*-->)?\s*([\d.,]+)\s*(?:<!--[^>]*-->)?\s*,-/);
  if (m5) {
    const cleaned = m5[1].replace(/\./g, "").replace(",", ".");
    const tvac = parseFloat(cleaned);
    if (!isNaN(tvac)) {
      return {
        price_cents: Math.round((tvac / 1.21) * 100),
        source: "html-rendered/1.21",
      };
    }
  }
  return { price_cents: null };
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
  // NB : les prix JSON-LD sont TVAC → on convertit en HTVA via /1.21 (TVA BE 21%)
  const offers = product.offers;
  let price_cents_tvac: number | undefined;
  let availability: string | undefined;
  let itemCondition: string | undefined;
  if (offers) {
    if (offers["@type"] === "AggregateOffer") {
      const lp = offers.lowPrice ?? offers.price;
      if (lp !== undefined) price_cents_tvac = Math.round(parseFloat(String(lp)) * 100);
      availability = offers.availability;
    } else if (Array.isArray(offers) && offers.length > 0) {
      const o = offers[0];
      if (o.price !== undefined) price_cents_tvac = Math.round(parseFloat(String(o.price)) * 100);
      availability = o.availability;
      itemCondition = o.itemCondition;
    } else {
      if (offers.price !== undefined) price_cents_tvac = Math.round(parseFloat(String(offers.price)) * 100);
      availability = offers.availability;
      itemCondition = offers.itemCondition;
    }
  }

  if (!price_cents_tvac || price_cents_tvac <= 0) return null;
  // Conversion TVAC → HTVA
  const price_cents = Math.round(price_cents_tvac / 1.21);

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
      vat_excluded: true,
      price_cents_tvac,
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
  // getAttribute pour avoir l'URL brute (link.href est résolu vs
  // chrome-extension:// dans un DOMParser hors navigateur)
  const href = link?.getAttribute("href") ?? "";
  if (!href) return null;
  const absoluteUrl = href.startsWith("http") ? href : `https://www.coolblue.be${href.startsWith("/") ? "" : "/"}${href}`;

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
