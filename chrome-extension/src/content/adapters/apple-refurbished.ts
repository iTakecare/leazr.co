/**
 * Adapter Apple Refurbished BE (www.apple.com/be-fr/shop/refurbished/*).
 *
 * Caractéristiques du site Apple :
 *  - Chaque produit est un JSON-LD <script type="application/ld+json"> complet
 *    avec name, price (TVAC), image, URL, condition=RefurbishedCondition
 *  - Pas de filtre URL fiable côté serveur : on fetch toute la catégorie
 *    (Mac, iPad, iPhone, Apple Watch, AirPods) puis on filtre côté adapter
 *  - Prix en EUR TVAC → on convertit en HT via /1.21
 */
import type { SiteAdapter, CapturedOffer, AdapterResult } from "../../lib/types";
import { publicHealthCheck } from "../../lib/health-check";

export const appleRefurbishedAdapter: SiteAdapter = {
  name: "apple-refurbished",
  key: "apple_refurbished",
  displayName: "Apple Refurbished",
  loginUrl: "https://www.apple.com/be-fr/shop/refurbished/mac",
  checkConnection: () => publicHealthCheck("https://www.apple.com/be-fr/shop/refurbished/mac"),

  matches: (url) =>
    /www\.apple\.com$/.test(url.hostname) && /\/shop\/refurbished\//.test(url.pathname),

  isProductPage: (_doc, url) => /\/shop\/product\//.test(url.pathname),

  extract: (doc, url): AdapterResult => {
    // Page produit Apple : un JSON-LD Product à la racine
    const scripts = doc.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
    for (const s of Array.from(scripts)) {
      try {
        const d = JSON.parse(s.textContent ?? "");
        if (d?.["@type"] === "Product" && d.name && d.offers) {
          const offer = productToOffer(d);
          if (offer) return { ok: true, offer: { ...offer, url: url.href } };
        }
      } catch { /* ignore */ }
    }
    return { ok: false, reason: "Aucun JSON-LD Product trouvé" };
  },

  buildSearchUrls: (query: string) => {
    const normalized = query.trim().toLowerCase();
    const candidates: string[] = [];

    // Détecter la catégorie Apple dans la query
    if (/\bmacbook\b|\bimac\b|\bmac\s*mini\b|\bmac\s*studio\b|\bmac\s*pro\b/i.test(normalized)) {
      candidates.push("https://www.apple.com/be-fr/shop/refurbished/mac");
    } else if (/\biphone\b/i.test(normalized)) {
      candidates.push("https://www.apple.com/be-fr/shop/refurbished/iphone");
    } else if (/\bipad\b/i.test(normalized)) {
      candidates.push("https://www.apple.com/be-fr/shop/refurbished/ipad");
    } else if (/\bapple\s*watch\b|\bwatch\b/i.test(normalized)) {
      candidates.push("https://www.apple.com/be-fr/shop/refurbished/watch");
    } else if (/\bairpods\b/i.test(normalized)) {
      // Pas de page refurb dédiée aux AirPods chez Apple (rare)
      return [];
    } else {
      // Par défaut, rien — on ne spam pas Apple pour des requêtes non Apple
      return [];
    }

    return candidates;
  },

  extractSearchResults: (doc, url, limit = 5): CapturedOffer[] => {
    const scripts = doc.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
    const allOffers: CapturedOffer[] = [];
    const seen = new Set<string>();

    for (const s of Array.from(scripts)) {
      try {
        const d = JSON.parse(s.textContent ?? "");
        if (d?.["@type"] !== "Product") continue;
        const offer = productToOffer(d);
        if (!offer) continue;
        if (seen.has(offer.url)) continue;
        seen.add(offer.url);
        allOffers.push(offer);
      } catch { /* ignore */ }
    }

    // On retourne TOUS les produits extraits — le filtrage (type + pertinence)
    // est fait par l'orchestrator qui a la query. Sans ça, on risquait de
    // tronquer à 20 avant d'avoir trouvé la variante précise que l'user cherche
    // (page /refurbished/mac contient 100+ produits).
    console.log(`[Leazr][apple] ${allOffers.length} produits refurb extraits (filtrage par orchestrator)`);
    return allOffers;
  },
};

/**
 * Convertit un JSON-LD Product Apple Refurbished en CapturedOffer.
 * Gère :
 *  - offers en array (tous les skus/configurations du produit)
 *  - prix TVAC → HT
 *  - free shipping détecté via shippingDetails.shippingRate.value = 0
 */
function productToOffer(product: any): CapturedOffer | null {
  const name = typeof product.name === "string" ? product.name.replace(/\u00a0/g, " ") : null;
  const url = product.url || product.mainEntityOfPage;
  if (!name || !url) return null;

  // Prendre la première offre (Apple liste généralement toutes les configurations)
  const offers = product.offers;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (!offer) return null;

  const priceTvac = typeof offer.price === "number"
    ? Math.round(offer.price * 100)
    : typeof offer.price === "string"
    ? Math.round(parseFloat(offer.price) * 100)
    : null;
  if (!priceTvac) return null;

  // Free shipping si shippingRate.value = 0
  const shippingCostCents =
    offer.shippingDetails?.shippingRate?.value !== undefined
      ? Math.round(parseFloat(String(offer.shippingDetails.shippingRate.value)) * 100)
      : 0;

  const isRefurb =
    offer.itemCondition &&
    /RefurbishedCondition/i.test(offer.itemCondition);

  return {
    title: name,
    brand: "Apple",
    price_cents: Math.round(priceTvac / 1.21), // HT
    currency: "EUR",
    delivery_cost_cents: Math.round(shippingCostCents / 1.21), // aussi HT
    delivery_days_min: 1,
    delivery_days_max: 3,
    condition: isRefurb ? "grade_a" : "new",
    warranty_months: 12, // Apple Refurbished garantit 1 an
    url: String(url),
    image_url: typeof product.image === "string" ? product.image : undefined,
    stock_status: "in_stock", // Apple n'affiche que les produits dispos
    captured_host: "www.apple.com",
    raw_specs: {
      is_apple_refurbished: true,
      sku: offer.sku,
      price_cents_tvac: priceTvac,
      vat_excluded: true,
      free_shipping: shippingCostCents === 0,
      return_days: offer.hasMerchantReturnPolicy?.merchantReturnDays,
    },
  };
}
