/**
 * Génération du "SKU ITC" — un SKU propre au tenant (préfixe configurable, ex. "ITC")
 * qui encode les caractéristiques du produit, indépendamment du SKU d'origine du
 * fabricant (le produit Leazr combine matériel + service).
 *
 * Exemple : prefix "ITC" + marque "HP" + modèle "ProBook 440G11" => "ITCHPPRB440G11"
 *
 * Règles :
 *  - tout est normalisé (sans accents, MAJUSCULES, caractères alphanumériques uniquement)
 *  - le préfixe et la marque sont conservés tels quels après normalisation
 *  - le modèle est tokenisé sur les espaces :
 *      • token contenant un chiffre  -> conservé tel quel       ("440G11" -> "440G11")
 *      • token purement alphabétique -> 1re lettre + consonnes
 *        suivantes, tronqué à 3 caractères                      ("ProBook" -> "PRB")
 *
 * NB : ce fichier est la source canonique de l'algorithme. Le script de backfill
 *      (scripts/backfill-sku-itc.mjs) en embarque une copie (impossible d'importer du
 *      TS dans un .mjs) ; garder les deux synchronisés en cas d'évolution des règles.
 */

/** Retire accents, met en MAJUSCULES et ne garde que [A-Z0-9]. */
export const normalizeSkuPart = (value?: string | null): string => {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

const hasDigit = (token: string): boolean => /[0-9]/.test(token);
const VOWELS = new Set(["A", "E", "I", "O", "U", "Y"]);

/**
 * Abrège un token purement alphabétique : on garde la 1re lettre puis on
 * complète avec les consonnes suivantes, tronqué à 3 caractères.
 * "PROBOOK" -> "P" + "R","B","K" -> "PRB" ; "AIR" (<=3) -> "AIR".
 */
const abbreviateAlphaToken = (norm: string): string => {
  if (norm.length <= 3) return norm;
  const consonants = norm
    .slice(1)
    .split("")
    .filter((c) => !VOWELS.has(c));
  const abbr = (norm[0] + consonants.join("")).slice(0, 3);
  // Repli si trop peu de consonnes (ex. "AEON" -> "AN" -> on complète au besoin)
  return abbr.length >= 3 ? abbr : norm.slice(0, 3);
};

/** Abrège un libellé de modèle selon les règles décrites en tête de fichier. */
export const abbreviateModel = (model?: string | null): string => {
  if (!model) return "";
  return model
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const norm = normalizeSkuPart(token);
      if (!norm) return "";
      return hasDigit(norm) ? norm : abbreviateAlphaToken(norm);
    })
    .join("");
};

/**
 * Retire la marque en tête du nom (ex. nom "HP ProBook 440G11", marque "HP"
 * -> "ProBook 440G11"). Comparaison insensible à la casse et aux accents.
 */
const stripBrandFromName = (name: string, brand: string): string => {
  const nameTokens = name.split(/\s+/).filter(Boolean);
  const brandTokens = brand
    .split(/\s+/)
    .map(normalizeSkuPart)
    .filter(Boolean);

  let i = 0;
  while (
    i < nameTokens.length &&
    i < brandTokens.length &&
    normalizeSkuPart(nameTokens[i]) === brandTokens[i]
  ) {
    i++;
  }
  return nameTokens.slice(i).join(" ");
};

/** Longueur maximale d'un SKU client (préfixe inclus). */
export const MAX_SKU_ITC_LENGTH = 14;

/**
 * Nombre max de caractères réservés à la marque, pour laisser de la place au
 * modèle dans le budget total. Les marques courtes (HP…) passent entières ;
 * les longues sont abrégées (APPLE→AP, SAMSUNG→SA) afin que le modèle survive.
 */
const BRAND_CAP = 2;

export interface GenerateSkuItcParams {
  /** Préfixe du tenant (companies.sku_prefix), ex. "ITC". */
  prefix?: string | null;
  brand?: string | null;
  /** Modèle explicite ; si absent, dérivé du nom (marque retirée). */
  model?: string | null;
  name?: string | null;
  /** Longueur max du résultat (défaut MAX_SKU_ITC_LENGTH). */
  maxLength?: number;
}

/** Construit le SKU ITC suggéré, tronqué à maxLength (non garanti unique — voir ensureUniqueSkuItc). */
export const generateSkuItc = ({
  prefix,
  brand,
  model,
  name,
  maxLength = MAX_SKU_ITC_LENGTH,
}: GenerateSkuItcParams): string => {
  const prefixPart = normalizeSkuPart(prefix);
  const brandFull = normalizeSkuPart(brand);

  let modelSource = (model ?? "").trim();
  if (!modelSource) {
    modelSource = stripBrandFromName(name ?? "", brand ?? "");
  }
  const modelPart = abbreviateModel(modelSource);

  // Répartition du budget : préfixe (fixe) + marque (plafonnée) + modèle (reste).
  const budget = Math.max(0, maxLength - prefixPart.length);
  const brandPart = brandFull.slice(0, Math.min(BRAND_CAP, budget));
  const modelBudget = Math.max(0, budget - brandPart.length);

  return `${prefixPart}${brandPart}${modelPart.slice(0, modelBudget)}`.slice(0, maxLength);
};

/**
 * Garantit l'unicité du candidat au sein d'un ensemble déjà utilisé en suffixant
 * "-2", "-3"… tout en restant ≤ maxLength (la base est tronquée pour laisser la
 * place au suffixe). L'ensemble n'est PAS muté.
 */
export const ensureUniqueSkuItc = (
  candidate: string,
  taken: Set<string>,
  maxLength = MAX_SKU_ITC_LENGTH
): string => {
  if (!candidate) return candidate;
  const base = candidate.slice(0, maxLength);
  if (!taken.has(base)) return base;
  let i = 2;
  for (;;) {
    const suffix = `-${i}`;
    const next = candidate.slice(0, Math.max(0, maxLength - suffix.length)) + suffix;
    if (!taken.has(next)) return next;
    i++;
  }
};
