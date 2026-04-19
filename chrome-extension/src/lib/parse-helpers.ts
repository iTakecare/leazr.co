/**
 * Helpers partagés entre adapters pour parser proprement les DOMs.
 */
import type { StockStatus, ProductCondition } from "./types";

/** "1 299,99 €" | "€1,299.99" | "1299 EUR" → 129999 (centimes) */
export function parsePriceCents(text: string | null | undefined): number | null {
  if (!text) return null;
  // retirer tout sauf chiffres, virgule, point
  const cleaned = text.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;

  // Normaliser séparateurs : garder le dernier (,) ou (.) comme séparateur décimal
  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // Les deux séparateurs présents : le dernier est décimal
    if (lastComma > lastDot) {
      // Virgule décimale (format européen) : "1.299,99" → "1299.99"
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // Point décimal (format US) : "1,299.99" → "1299.99"
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    // Une seule virgule : probablement décimale
    const after = cleaned.substring(lastComma + 1);
    if (after.length <= 2) normalized = cleaned.replace(",", ".");
    else normalized = cleaned.replace(/,/g, ""); // c'était un séparateur de milliers
  }

  const n = parseFloat(normalized);
  if (isNaN(n)) return null;
  return Math.round(n * 100);
}

/** Extrait {min, max} jours depuis un texte type "Livré dans 2-3 jours" */
export function parseDeliveryDays(text: string | null | undefined): { min?: number; max?: number } {
  if (!text) return {};
  const rangeMatch = text.match(/(\d+)\s*[-àto]+\s*(\d+)\s*(jours?|days?|ouvr[ée]s?|werkdagen)/i);
  if (rangeMatch) return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };

  const singleMatch = text.match(/(\d+)\s*(jours?|days?|ouvr[ée]s?|werkdagen)/i);
  if (singleMatch) {
    const n = parseInt(singleMatch[1], 10);
    return { min: n, max: n };
  }
  if (/demain|tomorrow/i.test(text)) return { min: 1, max: 1 };
  if (/aujourd'hui|today/i.test(text)) return { min: 0, max: 0 };
  return {};
}

/** Détecte le statut stock depuis un texte libre */
export function parseStockStatus(text: string | null | undefined): StockStatus {
  if (!text) return "unknown";
  const t = text.toLowerCase();
  if (/rupture|sold\s*out|uitverkocht|indispo|non disponible|out\s*of\s*stock/i.test(t)) return "out_of_stock";
  if (/dernier|derniers|plus que|only\s*\d+\s*left|limited/i.test(t)) return "limited";
  if (/en stock|in stock|disponible|available|op voorraad/i.test(t)) return "in_stock";
  return "unknown";
}

/** Détecte la condition produit depuis un texte libre */
export function parseCondition(text: string | null | undefined): ProductCondition {
  if (!text) return "unknown";
  const t = text.toLowerCase();
  if (/neuf|new|nieuw/i.test(t) && !/recond|refurb/i.test(t)) return "new";
  if (/grade\s*a|\bparfait\b|\bexcellent\b|very good|tr[èe]s bon/i.test(t)) return "grade_a";
  if (/grade\s*b|\bbon\b|\bgood\b|acceptable/i.test(t)) return "grade_b";
  if (/grade\s*c|\bcorrect\b|\bfair\b|traces/i.test(t)) return "grade_c";
  if (/recond|refurb|2[èe]me\s*chance|seconde main|second\s*hand/i.test(t)) return "grade_a"; // fallback
  return "unknown";
}

/** Parse "12 mois de garantie" / "2 year warranty" */
export function parseWarrantyMonths(text: string | null | undefined): number | undefined {
  if (!text) return undefined;
  const monthMatch = text.match(/(\d+)\s*mois/i);
  if (monthMatch) return parseInt(monthMatch[1], 10);
  const yearMatch = text.match(/(\d+)\s*(an|year)/i);
  if (yearMatch) return parseInt(yearMatch[1], 10) * 12;
  return undefined;
}

/** Extraction robuste : premier sélecteur qui trouve du contenu */
export function firstText(doc: Document | Element, selectors: string[]): string | null {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    const txt = el?.textContent?.trim();
    if (txt) return txt;
  }
  return null;
}

/** Même principe pour un attribut */
export function firstAttr(doc: Document | Element, selectors: string[], attr: string): string | null {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    const v = el?.getAttribute(attr);
    if (v) return v;
  }
  return null;
}

/** Extraire JSON-LD (très utile, beaucoup de sites ont schema.org Product) */
export function extractJsonLd(doc: Document): Record<string, unknown>[] {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const all: Record<string, unknown>[] = [];
  scripts.forEach((s) => {
    try {
      const json = JSON.parse(s.textContent ?? "");
      if (Array.isArray(json)) all.push(...json);
      else all.push(json);
    } catch { /* ignore */ }
  });
  return all;
}

/** Cherche un Product dans le JSON-LD et retourne un objet normalisé */
export function jsonLdProduct(doc: Document): {
  name?: string;
  brand?: string;
  price_cents?: number;
  image?: string;
  availability?: string;
} | null {
  const docs = extractJsonLd(doc);
  for (const node of docs) {
    const type = (node as any)["@type"];
    if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
      const offers = (node as any).offers;
      const offer = Array.isArray(offers) ? offers[0] : offers;
      const price = offer?.price ? Math.round(parseFloat(offer.price) * 100) : undefined;
      const brand = (node as any).brand?.name ?? (node as any).brand;
      const image = Array.isArray((node as any).image) ? (node as any).image[0] : (node as any).image;
      return {
        name: (node as any).name,
        brand: typeof brand === "string" ? brand : undefined,
        price_cents: price,
        image: typeof image === "string" ? image : undefined,
        availability: offer?.availability,
      };
    }
  }
  return null;
}
