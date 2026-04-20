/**
 * Adapter Amazon FR (Amazon Business inclus via cookies du navigateur).
 *
 * Amazon bloque tous les fetches anonymes (HTTP 202 vide → bot check).
 * On active donc `credentials: "include"` pour réutiliser les cookies
 * du navigateur Chrome de l'utilisateur. Si l'user est connecté à son
 * compte Amazon Business dans Chrome, l'extension voit automatiquement :
 *  - les prix HT B2B
 *  - les remises pro
 *  - les stocks dédiés Business
 *
 * Aucun credential n'est jamais stocké dans l'extension.
 *
 * Amazon affiche les prix TVAC par défaut (grand public) MAIS EN HT pour
 * les comptes Business connectés. Pour être safe :
 *  - si le HTML contient "Hors TVA" ou "VAT excluded" ou "Business price"
 *    → considérer prix déjà HT
 *  - sinon TVAC → /1.21
 */
import type { SiteAdapter, CapturedOffer, AdapterResult } from "../../lib/types";
import { parsePriceCents } from "../../lib/parse-helpers";

export const amazonAdapter: SiteAdapter = {
  name: "amazon",
  key: "amazon",
  displayName: "Amazon Business FR",

  matches: (url) => /(^|\.)amazon\.(fr|de|nl|com|com\.be)$/.test(url.hostname),

  isProductPage: (_doc, url) => /\/dp\/|\/gp\/product\//.test(url.pathname),

  requiresCookies: true,
  loginUrl: "https://www.amazon.fr/business",

  // ═══ Cookies du navigateur réutilisés pour les prix pro ═══
  fetchOptions: {
    credentials: "include",
    headers: {
      // Amazon repère les requêtes "fetch depuis extension" trop bien, on
      // simule un vrai navigateur
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    },
  },

  checkConnection: async () => {
    const now = new Date().toISOString();
    try {
      const resp = await fetch("https://www.amazon.fr/gp/your-account/order-history", {
        credentials: "include",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9",
        },
      });
      // Amazon redirect vers /ap/signin si pas connecté
      if (/\/(ap\/)?signin/i.test(resp.url)) {
        return {
          connected: false,
          reason: "not_logged_in",
          message: "Tu n'es pas connecté à Amazon Business dans Chrome",
          login_url: "https://www.amazon.fr/business",
          last_checked_at: now,
        };
      }
      const html = await resp.text();
      // Amazon place le prénom dans .nav-line-1 ou aria-label
      const nameMatch =
        html.match(/Bonjour[,\s]+([A-Za-zÀ-ÿ\- ]{2,30})/) ||
        html.match(/Hello[,\s]+([A-Za-zÀ-ÿ\- ]{2,30})/);
      return {
        connected: true,
        user_info: nameMatch ? nameMatch[1].trim() : undefined,
        last_checked_at: now,
      };
    } catch (e: any) {
      return {
        connected: false,
        reason: "site_down",
        message: e?.message ?? "Erreur réseau",
        login_url: "https://www.amazon.fr/business",
        last_checked_at: now,
      };
    }
  },

  extract: (doc, url): AdapterResult => {
    // Page produit Amazon : #productTitle + #priceblock_ourprice / .a-price
    const title = doc.querySelector<HTMLElement>("#productTitle")?.textContent?.trim();
    if (!title) return { ok: false, reason: "Titre introuvable" };

    const priceText =
      doc.querySelector<HTMLElement>("#priceblock_ourprice")?.textContent?.trim() ||
      doc.querySelector<HTMLElement>("#priceblock_dealprice")?.textContent?.trim() ||
      doc.querySelector<HTMLElement>(".a-price .a-offscreen")?.textContent?.trim();
    const price_cents_raw = parsePriceCents(priceText ?? "");
    if (!price_cents_raw) return { ok: false, reason: "Prix introuvable" };

    const isBusinessHT = isBusinessHtPrice(doc);
    const price_cents = isBusinessHT
      ? price_cents_raw
      : Math.round(price_cents_raw / 1.21);

    const image_url =
      doc.querySelector<HTMLImageElement>("#landingImage")?.src ??
      doc.querySelector<HTMLImageElement>(".a-dynamic-image")?.src ??
      undefined;

    return {
      ok: true,
      offer: {
        title,
        price_cents,
        currency: "EUR",
        condition: /refurbi|warehouse|occasion/i.test(title) ? "grade_a" : "new",
        url: url.href,
        image_url,
        stock_status: "unknown",
        captured_host: url.hostname,
        raw_specs: {
          price_cents_tvac: isBusinessHT ? Math.round(price_cents_raw * 1.21) : price_cents_raw,
          vat_excluded: true,
          is_business_ht: isBusinessHT,
        },
      },
    };
  },

  buildSearchUrls: (query: string) => {
    const q = encodeURIComponent(query.trim());
    const candidates: string[] = [];
    // Amazon Business search (prix HT si connecté pro)
    candidates.push(`https://www.amazon.fr/b2b/search?k=${q}`);
    // Standard search (fallback)
    candidates.push(`https://www.amazon.fr/s?k=${q}`);
    return candidates;
  },

  extractSearchResults: (doc, url, limit = 5): CapturedOffer[] => {
    // Amazon search : cartes avec data-asin="BXXXXXXXXX"
    const cards = Array.from(
      doc.querySelectorAll<HTMLElement>(
        '[data-component-type="s-search-result"], [data-asin^="B0"], .s-result-item[data-asin]'
      )
    ).filter((el) => el.getAttribute("data-asin"));

    const offers: CapturedOffer[] = [];
    const seen = new Set<string>();
    const isBusinessHT = isBusinessHtPrice(doc);

    for (const card of cards.slice(0, limit * 3)) {
      if (offers.length >= limit) break;

      const asin = card.getAttribute("data-asin");
      if (!asin || seen.has(asin)) continue;
      seen.add(asin);

      const titleEl = card.querySelector<HTMLElement>("h2, .a-size-medium.a-color-base.a-text-normal, .a-size-base-plus");
      const title = titleEl?.textContent?.trim();
      if (!title) continue;

      // Prix : .a-price .a-offscreen (format avec devise)
      const priceEl = card.querySelector<HTMLElement>(".a-price .a-offscreen");
      const price_raw = parsePriceCents(priceEl?.textContent ?? "");
      if (!price_raw) continue;
      const price_cents = isBusinessHT ? price_raw : Math.round(price_raw / 1.21);

      // URL : ATTENTION — dans un DOMParser hors du navigateur,
      // link.href est résolu par rapport à chrome-extension:// ce qui casse
      // l'URL. On utilise getAttribute puis on reconstruit en absolu.
      const link = card.querySelector<HTMLAnchorElement>("h2 a, .a-link-normal");
      const rawHref = link?.getAttribute("href");
      if (!rawHref) continue;
      const href = rawHref.startsWith("http")
        ? rawHref
        : `https://${url.hostname}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

      // Image
      const img = card.querySelector<HTMLImageElement>("img.s-image");
      const image_url = img?.src;

      // Condition : Amazon Warehouse Deals = occasion / retour
      const isWarehouse =
        /warehouse|occasion|reconditionn|refurbi/i.test(title) ||
        !!card.querySelector('[aria-label*="Used"], [aria-label*="Reconditionn"]');

      offers.push({
        title,
        price_cents,
        currency: "EUR",
        condition: isWarehouse ? "grade_a" : "new",
        url: href,
        image_url,
        stock_status: "unknown",
        captured_host: url.hostname,
        raw_specs: {
          asin,
          price_cents_tvac: isBusinessHT ? Math.round(price_raw * 1.21) : price_raw,
          vat_excluded: true,
          is_business_ht: isBusinessHT,
          is_warehouse: isWarehouse,
        },
      });
    }

    console.log(
      `[Leazr][amazon] ${offers.length} offres extraites (businessHT=${isBusinessHT})`
    );
    return offers;
  },
};

/**
 * Détecte si on a la vue Amazon Business HT active.
 * Indicateurs :
 *  - présence du switch "HT / TTC" réglé sur HT
 *  - texte "Hors TVA" / "VAT excluded" près des prix
 *  - classe .s-business-only
 */
function isBusinessHtPrice(doc: Document): boolean {
  const bodyText = doc.body?.innerText ?? "";
  if (/hors\s*tva|vat\s*excluded|prix\s*ht|business\s*price/i.test(bodyText)) return true;
  if (doc.querySelector('[class*="business-only"], [class*="business-price"]')) return true;
  return false;
}
