/**
 * Adapter Coolblue (coolblue.be / coolblue.nl)
 *
 * Pages produit typiques :
 *  https://www.coolblue.be/fr/produit/906398/...
 *  https://www.coolblue.nl/product/906398/...
 */
import type { SiteAdapter, CapturedOffer, AdapterResult } from "../../lib/types";
import {
  firstText,
  firstAttr,
  parsePriceCents,
  parseDeliveryDays,
  parseStockStatus,
  parseCondition,
  jsonLdProduct,
} from "../../lib/parse-helpers";

export const coolblueAdapter: SiteAdapter = {
  name: "coolblue",

  matches: (url) => /coolblue\.(be|nl|com)$/.test(url.hostname),

  isProductPage: (doc, url) => {
    // URL pattern : /produit/<id>/... ou /product/<id>/...
    if (/\/(produit|product)\/\d+/.test(url.pathname)) return true;
    // Ou JSON-LD Product présent
    return jsonLdProduct(doc) !== null;
  },

  extract: (doc, url): AdapterResult => {
    // D'abord JSON-LD (le plus fiable)
    const jld = jsonLdProduct(doc);

    const title =
      jld?.name ??
      firstText(doc, [
        'h1[data-testid="product-title"]',
        'h1.product-header__title',
        'h1[itemprop="name"]',
        "h1",
      ]);

    if (!title) return { ok: false, reason: "Titre produit introuvable" };

    const price_cents =
      jld?.price_cents ??
      parsePriceCents(
        firstText(doc, [
          ".sales-price__current",
          '[data-testid="sales-price-current"]',
          ".sales-price",
          '[itemprop="price"]',
        ])
      );

    if (!price_cents) return { ok: false, reason: "Prix introuvable" };

    const deliveryText = firstText(doc, [
      '[data-testid="delivery-promise"]',
      ".product-page__delivery",
      ".delivery-promise",
    ]);
    const delivery = parseDeliveryDays(deliveryText);

    const stockText = firstText(doc, [
      '[data-testid="stock-status"]',
      ".product-page__stock",
      ".js-product-stock-info",
    ]);
    const stock_status = parseStockStatus(stockText ?? deliveryText);

    const conditionText = firstText(doc, [
      '[data-testid="product-condition"]',
      ".product-condition",
    ]);
    const condition = parseCondition(conditionText) ?? "new"; // Coolblue vend majoritairement du neuf

    const image_url =
      jld?.image ??
      firstAttr(
        doc,
        ['img[data-testid="product-image"]', ".product-image img", 'img[itemprop="image"]'],
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
    };

    return { ok: true, offer };
  },
};
