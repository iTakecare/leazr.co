/**
 * Adapter Coolblue (coolblue.be / coolblue.nl)
 *
 * Pages produit supportées :
 *  - /fr/produit/<id>/...                 (neuf)
 *  - /fr/deuxieme-chance-produit/<id>/... (reconditionné — "Deuxième Chance")
 *  - /nl/product/<id>/...                 (équivalent néerlandais)
 *  - /nl/tweedekans-product/<id>/...      (reconditionné NL)
 *  - /be/fr/...                           (variantes régionales)
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
} from "../../lib/parse-helpers";

const PRODUCT_PATH_RE =
  /\/(produit|product|deuxieme-chance-produit|tweedekans-product|2ehands-product|seconde-main|refurbished|outlet)\/\d+/i;

export const coolblueAdapter: SiteAdapter = {
  name: "coolblue",

  matches: (url) => /coolblue\.(be|nl|com)$/.test(url.hostname),

  isProductPage: (doc, url) => {
    // 1) URL pattern
    if (PRODUCT_PATH_RE.test(url.pathname)) return true;
    // 2) JSON-LD Product présent
    if (jsonLdProduct(doc)) return true;
    // 3) Heuristique DOM : h1 + prix visible
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

    // JSON-LD en priorité (le plus fiable)
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

    if (!title) {
      console.warn("[Leazr][coolblue] Titre introuvable");
      return { ok: false, reason: "Titre produit introuvable" };
    }

    // Prix : utiliser la stratégie robuste (proximité bouton panier + plus gros visuel)
    // On passe d'abord les sélecteurs Coolblue spécifiques, puis l'algo générique prend le relais
    const priceResult = findMainPrice(doc, [
      '[data-testid="product-price"] .sales-price__current',
      '[data-testid="sales-price-current"]',
      ".js-product-page-main-sales-price .sales-price__current",
      ".product-header .sales-price__current",
    ]);

    // Ne pas utiliser le JSON-LD comme source primaire : Coolblue met souvent plusieurs
    // offres dedans (variantes) et on prend la mauvaise. On ne l'utilise qu'en dernier recours
    // si la stratégie DOM échoue.
    const price_cents = priceResult.cents ?? jld?.price_cents ?? null;
    const priceSource = priceResult.cents ? priceResult.source : jld?.price_cents ? "json-ld" : "none";

    console.log(`[Leazr][coolblue] Prix: ${price_cents} cents (source: ${priceSource})`);

    if (!price_cents) {
      console.warn("[Leazr][coolblue] Prix introuvable");
      return { ok: false, reason: "Prix introuvable" };
    }

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

    // Condition : Coolblue "Deuxième Chance" → reconditionné grade A par défaut
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

    const offer: CapturedOffer = {
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
      raw_specs: {
        is_deuxieme_chance: isDeuxiemeChance,
      },
    };

    console.log("[Leazr][coolblue] Offre extraite:", offer);
    return { ok: true, offer };
  },
};
