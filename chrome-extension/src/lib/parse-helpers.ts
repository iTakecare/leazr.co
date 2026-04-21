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
      // Gère : Offer simple, liste d'Offers, AggregateOffer (lowPrice)
      let price: number | undefined;
      let availability: string | undefined;
      if (offers) {
        if (offers["@type"] === "AggregateOffer" && offers.lowPrice) {
          price = Math.round(parseFloat(offers.lowPrice) * 100);
        } else if (Array.isArray(offers) && offers.length > 0) {
          // Préférer l'offre "InStock" si dispo
          const inStock = offers.find((o: any) =>
            /InStock|in_stock/i.test(String(o.availability ?? ""))
          );
          const chosen = inStock ?? offers[0];
          price = chosen?.price ? Math.round(parseFloat(chosen.price) * 100) : undefined;
          availability = chosen?.availability;
        } else {
          price = offers.price ? Math.round(parseFloat(offers.price) * 100) : undefined;
          availability = offers.availability;
        }
      }
      const brand = (node as any).brand?.name ?? (node as any).brand;
      const image = Array.isArray((node as any).image) ? (node as any).image[0] : (node as any).image;
      return {
        name: (node as any).name,
        brand: typeof brand === "string" ? brand : undefined,
        price_cents: price,
        image: typeof image === "string" ? image : undefined,
        availability,
      };
    }
  }
  return null;
}

/**
 * Filtre des offres par pertinence à partir de la query.
 *
 * Règles :
 *  - Tokens exclusifs (pro/air/mini/max/ultra/plus) DOIVENT figurer dans le titre
 *    et leurs opposés sont rejetés (Pro ≠ Air, Mini ≠ Pro/Max, etc.)
 *  - Les autres tokens de la query : au moins 50% doivent matcher (substring ok
 *    pour les tokens courts type "m5", exact match pour les longs).
 *  - Tri par score décroissant.
 *
 * Commun à tous les adapters — appeler depuis extractSearchResults ou depuis
 * l'orchestrator avant retour.
 */
import type { CapturedOffer as Offer } from "./types";
/**
 * Détecte la "signature produit" dans une query (MacBook Pro, iMac, Mac Mini, iPad, etc.)
 * et retourne les tokens obligatoires qui DOIVENT figurer dans le titre d'une offre,
 * sinon elle est rejetée même en mode élargi. Cela évite d'afficher des iMac quand
 * on cherche MacBook Pro.
 *
 * Reconnus (ordre important — le plus spécifique d'abord) :
 *  - "macbook pro"  → ["macbook", "pro"]
 *  - "macbook air"  → ["macbook", "air"]
 *  - "macbook"      → ["macbook"]
 *  - "mac mini"     → ["mac", "mini"]
 *  - "mac studio"   → ["mac", "studio"]
 *  - "mac pro"      → ["mac", "pro"] (but NOT macbook)
 *  - "imac"         → ["imac"]
 *  - "iphone"       → ["iphone"]
 *  - "ipad"         → ["ipad"]
 *  - "apple watch" / "watch" → ["watch"]
 *  - "airpods"      → ["airpods"]
 *  - "surface"      → ["surface"]
 *  - Sinon : null (pas de contrainte type)
 */
/**
 * Tokens d'accessoires à TOUJOURS exclure pour les produits (iPhone, iPad, Mac,
 * Watch, AirPods). Un titre contenant "cover" ou "coque" est un accessoire,
 * pas l'appareil lui-même. Liste fusionnée FR/EN/NL.
 */
const ACCESSORY_FORBIDDEN = [
  // Coques / étuis
  "cover", "covers", "coque", "coques", "etui", "etuis", "housse", "housses",
  "case", "cases", "sleeve", "sleeves", "hoes", "hoesje",
  // Protections écran
  "protector", "protective", "protege", "protection", "glass", "screenprotector",
  // Câbles / chargeurs / docks
  "chargeur", "charger", "cable", "cables", "kabel", "kabels",
  "adapter", "adaptateur", "adaptor", "dock", "stand", "support",
  "oplader", "oplaadkabel",
  // Accessoires divers (attention à ne pas trop en mettre — "keyboard" peut être
  // légitime pour l'iPad Magic Keyboard qu'on vendrait comme accessoire, mais ici
  // on le traite comme accessoire : si l'admin cherche un Magic Keyboard, il
  // tapera "Magic Keyboard" et non "iPad".)
  "keyboard", "clavier", "toetsenbord", "pencil", "stylus",
  "mount", "holder", "belt", "strap", "band", "bandje",
  "airtag", "tag",
];

/**
 * Extrait le numéro de génération depuis un pattern "iphone 17" ou "ipad 11".
 * Retourne null si absent. Les queries Apple Refurb indexent rarement le
 * numéro seul, donc on ne force le match que si la query le contient.
 */
function extractGeneration(query: string, basePattern: RegExp): string | null {
  const m = query.match(basePattern);
  return m ? m[1] : null;
}

export function inferProductTypeTokens(query: string): {
  required: string[];
  forbidden: string[];
} | null {
  const q = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // MacBook Pro : doit contenir macbook + pro, ne doit PAS contenir air/mini
  if (/\bmacbook\s+pro\b/.test(q))
    return {
      required: ["macbook", "pro"],
      forbidden: ["air", "mini", ...ACCESSORY_FORBIDDEN],
    };
  // MacBook Air
  if (/\bmacbook\s+air\b/.test(q))
    return {
      required: ["macbook", "air"],
      forbidden: ["pro", "mini", ...ACCESSORY_FORBIDDEN],
    };
  // MacBook générique
  if (/\bmacbook\b/.test(q))
    return { required: ["macbook"], forbidden: [...ACCESSORY_FORBIDDEN] };
  // Mac Mini
  if (/\bmac\s+mini\b/.test(q))
    return {
      required: ["mac", "mini"],
      forbidden: ["book", "pro", "studio", "imac", ...ACCESSORY_FORBIDDEN],
    };
  // Mac Studio
  if (/\bmac\s+studio\b/.test(q))
    return {
      required: ["mac", "studio"],
      forbidden: ["book", "mini", "imac", ...ACCESSORY_FORBIDDEN],
    };
  // Mac Pro (attention, NOT MacBook Pro)
  if (/\bmac\s+pro\b/.test(q) && !/\bmacbook\b/.test(q))
    return {
      required: ["mac", "pro"],
      forbidden: ["book", "air", "mini", "studio", "imac", ...ACCESSORY_FORBIDDEN],
    };
  // iMac
  if (/\bimac\b/.test(q))
    return {
      required: ["imac"],
      forbidden: ["macbook", "mini", "studio", ...ACCESSORY_FORBIDDEN],
    };
  // iPad Pro / Air / Mini (avec génération optionnelle "ipad 11", "ipad pro 13" etc.)
  // Pour iPad, le numéro est souvent la taille en pouces (11, 13) donc on ne le force pas.
  if (/\bipad\s+pro\b/.test(q))
    return {
      required: ["ipad", "pro"],
      forbidden: ["mini", "air", ...ACCESSORY_FORBIDDEN],
    };
  if (/\bipad\s+air\b/.test(q))
    return {
      required: ["ipad", "air"],
      forbidden: ["pro", "mini", ...ACCESSORY_FORBIDDEN],
    };
  if (/\bipad\s+mini\b/.test(q))
    return {
      required: ["ipad", "mini"],
      forbidden: ["pro", "air", ...ACCESSORY_FORBIDDEN],
    };
  if (/\bipad\b/.test(q))
    return { required: ["ipad"], forbidden: [...ACCESSORY_FORBIDDEN] };

  // iPhone — capturer le numéro de génération (12, 13, 14, 15, 16, 17, 18, ...)
  // On l'exige dans le titre SI présent dans la query, sinon un iPhone 16
  // peut matcher une query iPhone 17.
  const iphoneGen = extractGeneration(q, /\biphone\s+(\d{1,2})\b/);
  if (/\biphone\b.*\bpro\s+max\b/.test(q)) {
    const required = ["iphone", "pro", "max"];
    if (iphoneGen) required.push(iphoneGen);
    return { required, forbidden: [...ACCESSORY_FORBIDDEN] };
  }
  if (/\biphone\b.*\bpro\b/.test(q)) {
    const required = ["iphone", "pro"];
    if (iphoneGen) required.push(iphoneGen);
    return { required, forbidden: ["max", ...ACCESSORY_FORBIDDEN] };
  }
  if (/\biphone\b.*\bplus\b/.test(q)) {
    const required = ["iphone", "plus"];
    if (iphoneGen) required.push(iphoneGen);
    return { required, forbidden: ["pro", "mini", ...ACCESSORY_FORBIDDEN] };
  }
  if (/\biphone\b.*\bmini\b/.test(q)) {
    const required = ["iphone", "mini"];
    if (iphoneGen) required.push(iphoneGen);
    return { required, forbidden: ["pro", "plus", "max", ...ACCESSORY_FORBIDDEN] };
  }
  if (/\biphone\b/.test(q)) {
    const required = ["iphone"];
    if (iphoneGen) required.push(iphoneGen);
    return {
      required,
      // iPhone "standard" (pas Pro, pas Plus, pas Mini) → on exclut les variantes
      forbidden: ["pro", "plus", "mini", "max", ...ACCESSORY_FORBIDDEN],
    };
  }
  // Apple Watch
  if (/\b(apple\s+)?watch\b/.test(q))
    return {
      required: ["watch"],
      forbidden: ["iphone", "ipad", ...ACCESSORY_FORBIDDEN],
    };
  // AirPods
  if (/\bairpods\b/.test(q))
    return { required: ["airpods"], forbidden: [...ACCESSORY_FORBIDDEN] };
  // Surface
  if (/\bsurface\b/.test(q))
    return { required: ["surface"], forbidden: [...ACCESSORY_FORBIDDEN] };
  return null;
}

/**
 * Filtre minimal "type produit uniquement" — applique inferProductTypeTokens
 * sans les contraintes strictes de specs. Utilisé pour le mode "élargi".
 */
export function filterOffersByProductType<T extends Offer>(offers: T[], query: string): T[] {
  const type = inferProductTypeTokens(query);
  if (!type) return offers;

  const normalize = (s: string): string[] =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Merger "256 Go" / "1 To" → "256go" / "1to" pour cohérence avec filterOffersByRelevance
      .replace(/(\d+)\s+(go|gb|gib|to|tb|tib|mo|mb|mib)\b/g, "$1$2")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2);

  return offers.filter((o) => {
    const titleTokens = new Set(
      normalize((o.title ?? "") + " " + (o.brand ?? ""))
    );
    for (const req of type.required) {
      if (!titleTokens.has(req)) return false;
    }
    for (const forb of type.forbidden) {
      if (titleTokens.has(forb)) return false;
    }
    return true;
  });
}

export function filterOffersByRelevance<T extends Offer>(offers: T[], query: string): T[] {
  if (!query.trim()) return offers;

  // Pré-filtre obligatoire par type produit
  offers = filterOffersByProductType(offers, query);
  if (offers.length === 0) return offers;

  const STOPWORDS = new Set([
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou",
    "en", "pour", "avec", "sans", "the", "and", "or", "of", "in", "with",
    "apple", // la marque est déjà implicite sur les adapters Apple
    // Unités peu discriminantes
    "pouces", "pouce", "inch", "inches",
  ]);

  // Synonymes de couleur cross-langue (FR, NL, EN). Mapping bidirectionnel
  // pour que "blue" dans la query matche "bleu" / "blauw" / "deep blue" dans
  // le titre et vice-versa. Couvre aussi les couleurs Apple (titane, sidéral,
  // cosmic orange, deep sea, etc.)
  const COLOR_SYNONYMS: Record<string, string[]> = {
    // Silver / argent / zilver
    argent: ["silver", "zilver"],
    silver: ["argent", "zilver"],
    zilver: ["argent", "silver"],
    // Noir / black / zwart + space/sideral (Apple)
    noir: ["black", "zwart", "sideral", "space"],
    black: ["noir", "zwart", "sideral", "space"],
    zwart: ["noir", "black", "sideral", "space"],
    sideral: ["noir", "black", "zwart", "space"],
    space: ["noir", "black", "zwart", "sideral"],
    // Blanc / white / wit
    blanc: ["white", "wit"],
    white: ["blanc", "wit"],
    wit: ["blanc", "white"],
    // Gris / gray / grey / grijs
    gris: ["gray", "grey", "grijs"],
    gray: ["gris", "grey", "grijs"],
    grey: ["gris", "gray", "grijs"],
    grijs: ["gris", "gray", "grey"],
    // Bleu / blue / blauw (mapping bidirectionnel — AJOUT CRITIQUE "blue")
    bleu: ["blue", "blauw"],
    blue: ["bleu", "blauw"],
    blauw: ["bleu", "blue"],
    // Rose / pink / roze
    rose: ["pink", "roze"],
    pink: ["rose", "roze"],
    roze: ["rose", "pink"],
    // Vert / green / groen
    vert: ["green", "groen"],
    green: ["vert", "groen"],
    groen: ["vert", "green"],
    // Jaune / yellow / geel
    jaune: ["yellow", "geel"],
    yellow: ["jaune", "geel"],
    geel: ["jaune", "yellow"],
    // Apple-specific — Titane / titanium
    titane: ["titanium"],
    titanium: ["titane"],
    // Cosmic orange / orange cosmique
    cosmic: ["orange", "cosmique"],
    cosmique: ["orange", "cosmic"],
    // Deep (souvent couplé à blue/sea) — traité comme adjectif ignoré pour match couleur
  };
  const EXCLUSIVE = new Set(["pro", "air", "max", "mini", "ultra", "plus"]);
  const OPPOSITES: Record<string, string[]> = {
    pro: ["air", "mini"],
    air: ["pro", "mini", "max"],
    mini: ["pro", "air", "max", "ultra"],
    max: ["air", "mini"],
    ultra: ["mini"],
  };

  const normalize = (s: string): string[] =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Merger "256 Go" / "1 To" / "16 GB" en un seul token "256go" / "1to" / "16gb"
      // AVANT split, pour que "256 Go" (titre) matche "256Go" (query) et inversement
      .replace(/(\d+)\s+(go|gb|gib|to|tb|tib|mo|mb|mib)\b/g, "$1$2")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  const queryTokens = normalize(query);
  if (queryTokens.length === 0) return offers;

  const requiredExclusives = queryTokens.filter((t) => EXCLUSIVE.has(t));
  const nonExclusiveTokens = queryTokens.filter((t) => !EXCLUSIVE.has(t));
  const minRequired =
    nonExclusiveTokens.length <= 2
      ? nonExclusiveTokens.length
      : Math.ceil(nonExclusiveTokens.length / 2);

  const forbiddenInTitle = new Set<string>();
  for (const exc of requiredExclusives) {
    for (const opp of OPPOSITES[exc] ?? []) forbiddenInTitle.add(opp);
  }

  const scored = offers
    .map((offer) => {
      const titleTokensArr = normalize((offer.title ?? "") + " " + (offer.brand ?? ""));
      const titleTokens = new Set(titleTokensArr);

      // Opposites strictement interdits dans le titre (Pro ≠ Air)
      for (const forbidden of forbiddenInTitle) {
        if (titleTokens.has(forbidden)) return { offer, score: -1 };
      }

      // Modificateurs exclusifs : si la query en contient plusieurs (ex: "Pro Max"
      // qui vient d'un item polymorphique), on accepte qu'AU MOINS UN soit dans
      // le titre (logique OR). Si un seul exclusive dans la query, il doit être
      // dans le titre (logique stricte).
      if (requiredExclusives.length === 1) {
        if (!titleTokens.has(requiredExclusives[0])) return { offer, score: -1 };
      } else if (requiredExclusives.length > 1) {
        const anyMatch = requiredExclusives.some((exc) => titleTokens.has(exc));
        if (!anyMatch) return { offer, score: -1 };
      }

      // Bonus de score si TOUS les exclusives matchent (meilleur produit)
      const exclusivesMatched = requiredExclusives.filter((exc) => titleTokens.has(exc)).length;

      const matched = nonExclusiveTokens.filter((t) => {
        if (titleTokens.has(t)) return true;

        // Synonymes de couleur (FR/EN/NL)
        const synonyms = COLOR_SYNONYMS[t];
        if (synonyms && synonyms.some((s) => titleTokens.has(s))) return true;

        // Normalisation "16go" / "16gb" / "256mo" / "1to" / "1tb"
        // pour que le filtre traite "16Go" == "16 GB" == "16GB"
        const normUnits = (s: string) =>
          s
            .replace(/([\d]+)\s*(go|gb|gib)/g, "$1gb")
            .replace(/([\d]+)\s*(to|tb|tib)/g, "$1tb")
            .replace(/([\d]+)\s*(mo|mb|mib)/g, "$1mb");
        const tNorm = normUnits(t);
        for (const tt of titleTokens) {
          if (normUnits(tt) === tNorm) return true;
        }

        for (const tt of titleTokens) {
          if (tt === t) return true;
          if (t.length <= 3 && tt.includes(t)) return true;
          if (t.length > 3 && tt.includes(t) && t.length >= tt.length - 2) return true;
        }
        return false;
      });

      return { offer, score: matched.length + exclusivesMatched * 0.5 };
    })
    .filter((x) => x.score >= minRequired);

  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.offer);
}

/**
 * Retourne true si l'élément ou un de ses ancêtres a text-decoration line-through
 * (prix barré = ancien prix qu'on doit ignorer).
 */
function isStrikethrough(el: Element): boolean {
  // 1) Balises explicites <del> et <s> dans la chaîne d'ancêtres
  if (el.closest("del, s")) return true;

  // 2) Classes parlantes
  if (el.closest('[class*="line-through"], [class*="strikethrough"], [class*="strike"], [class*="was-price"], [class*="old-price"], [class*="original-price"], [class*="previous-price"], [class*="discount__from"], [class*="sales-price__previous"]')) {
    return true;
  }

  // 3) Computed style sur l'élément ET ses ancêtres (jusqu'à 6 niveaux)
  if (typeof window === "undefined") return false;
  let cursor: Element | null = el;
  for (let i = 0; i < 6 && cursor; i++) {
    const cs = window.getComputedStyle(cursor);
    // textDecorationLine est plus fiable que textDecoration (short-hand)
    const dec = cs.textDecorationLine || cs.textDecoration || "";
    if (/line-through/i.test(dec)) return true;
    cursor = cursor.parentElement;
  }
  return false;
}

/**
 * Retourne true si l'élément est visible (pas display:none, pas visibility:hidden,
 * pas hors viewport avec taille 0).
 */
function isVisible(el: Element): boolean {
  if (typeof window === "undefined") return true;
  const cs = window.getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return false;
  const rect = (el as HTMLElement).getBoundingClientRect?.();
  if (!rect) return true;
  return rect.width > 0 && rect.height > 0;
}

/**
 * Collecte tous les candidats "prix" dans la page :
 *  - élément contenant € dans son texte direct (pas juste un descendant)
 *  - visible
 *  - non-barré (ni lui ni aucun ancêtre)
 *  - texte court (< 30 chars)
 * Retourne la liste avec font-size et position.
 */
function collectPriceCandidates(doc: Document) {
  const all = Array.from(doc.querySelectorAll("body *"));
  const candidates: Array<{
    el: Element;
    text: string;
    cents: number;
    fontSize: number;
    fontWeight: number;
  }> = [];

  for (const el of all) {
    // Prendre seulement les éléments où le TEXTE DIRECT (sans descendants) contient €
    // Pour éviter de considérer les parents qui englobent plusieurs prix
    const directText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join("")
      .trim();

    if (!directText || !/€|EUR/i.test(directText)) continue;
    if (directText.length > 40) continue;

    const cents = parsePriceCents(directText);
    if (!cents) continue;

    if (!isVisible(el)) continue;
    if (isStrikethrough(el)) continue;

    const cs = typeof window !== "undefined" ? window.getComputedStyle(el) : null;
    const fontSize = cs ? parseFloat(cs.fontSize) : 0;
    const fw = cs?.fontWeight ?? "400";
    const fontWeight = parseInt(fw, 10) || (fw === "bold" ? 700 : 400);

    candidates.push({ el, text: directText, cents, fontSize, fontWeight });
  }

  return candidates;
}

/**
 * Stratégie robuste pour trouver le prix principal sur n'importe quelle page produit :
 *  1. Sélecteurs spécifiques fournis
 *  2. Prix le plus proche du bouton "Ajouter au panier" (parmi les non-barrés)
 *  3. Prix le plus "important" visuellement = fontSize max, puis fontWeight max
 */
export function findMainPrice(
  doc: Document,
  specificSelectors: string[] = []
): { cents: number | null; source: string } {
  // ═══ 1. Sélecteurs spécifiques (toujours ignorer les barrés) ═══
  for (const sel of specificSelectors) {
    const els = Array.from(doc.querySelectorAll(sel));
    for (const el of els) {
      const txt = el.textContent?.trim() ?? "";
      if (!txt) continue;
      if (isStrikethrough(el)) continue;
      const cents = parsePriceCents(txt);
      if (cents) return { cents, source: `selector:${sel}` };
    }
  }

  // Construire la liste des candidats valides (non-barrés, visibles)
  const candidates = collectPriceCandidates(doc);
  if (candidates.length === 0) {
    return { cents: null, source: "no-candidates" };
  }

  // ═══ 2. Prix à proximité du bouton "Ajouter au panier" ═══
  const cartBtnKeywords = /dans mon panier|ajouter au panier|toevoegen|in winkelwagen|add to cart|add to basket|koop nu|acheter maintenant/i;
  const buttons = Array.from(doc.querySelectorAll("button, a[role='button'], a.btn, [class*='add-to-cart']"));
  const cartBtn = buttons.find((b) => cartBtnKeywords.test(b.textContent ?? ""));

  if (cartBtn) {
    // Pour chaque candidat, mesurer la distance DOM au bouton (nombre de nœuds à remonter)
    let bestCandidate: typeof candidates[0] | null = null;
    let bestDomDist = Infinity;
    for (const c of candidates) {
      const dist = domDistance(c.el, cartBtn);
      if (dist < bestDomDist && dist <= 8) {
        bestDomDist = dist;
        bestCandidate = c;
      }
    }
    if (bestCandidate) {
      return {
        cents: bestCandidate.cents,
        source: `near-cart-btn (domDist=${bestDomDist}, fontSize=${bestCandidate.fontSize}px, text="${bestCandidate.text}")`,
      };
    }
  }

  // ═══ 3. Plus "gros" prix (fontSize puis fontWeight) ═══
  candidates.sort((a, b) => {
    if (b.fontSize !== a.fontSize) return b.fontSize - a.fontSize;
    return b.fontWeight - a.fontWeight;
  });
  const best = candidates[0];
  return {
    cents: best.cents,
    source: `largest-font (${best.fontSize}px/${best.fontWeight}, text="${best.text}")`,
  };
}

/**
 * Distance DOM entre deux éléments : nombre minimum d'arêtes à traverser dans l'arbre.
 * Utilise le LCA (lowest common ancestor) et additionne les profondeurs.
 */
function domDistance(a: Element, b: Element): number {
  // Construire le chemin de racine à a et à b
  const pathA: Element[] = [];
  const pathB: Element[] = [];
  let cursor: Element | null = a;
  while (cursor) { pathA.push(cursor); cursor = cursor.parentElement; }
  cursor = b;
  while (cursor) { pathB.push(cursor); cursor = cursor.parentElement; }

  // Trouver le LCA
  const setA = new Set(pathA);
  let lcaIdxB = -1;
  for (let i = 0; i < pathB.length; i++) {
    if (setA.has(pathB[i])) { lcaIdxB = i; break; }
  }
  if (lcaIdxB === -1) return Infinity;
  const lca = pathB[lcaIdxB];
  const lcaIdxA = pathA.indexOf(lca);
  return lcaIdxA + lcaIdxB;
}
