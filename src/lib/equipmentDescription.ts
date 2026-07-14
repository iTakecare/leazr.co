/**
 * Utilitaires pour les descriptions d'équipement "à la main" (ex : une config PC
 * assemblée dont tous les composants sont regroupés en une seule ligne d'offre).
 *
 * Convention de stockage (dans le champ unique `offer_equipment.title`, sans
 * migration ni nouvelle colonne) :
 *   - la 1re ligne non vide = intitulé court affiché en gras
 *   - les lignes suivantes = composants / caractéristiques, une par ligne
 *
 * Les descriptions historiques (une seule longue ligne) restent affichées
 * telles quelles : aucune ligne de composant n'est détectée, donc `specs` est vide.
 */

export interface ParsedEquipmentDescription {
  /** Intitulé court (1re ligne) — repli sur la chaîne brute si vide. */
  title: string;
  /** Composants / caractéristiques (lignes suivantes). */
  specs: string[];
}

/** Découpe un `title` stocké en intitulé + liste de composants. */
export const parseEquipmentDescription = (
  raw?: string | null
): ParsedEquipmentDescription => {
  const lines = (raw ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { title: "", specs: [] };
  }

  const [title, ...specs] = lines;
  return { title, specs };
};

/** Recompose un `title` stockable à partir d'un intitulé et de composants. */
export const buildEquipmentDescription = (
  title: string,
  specs: string[]
): string => {
  const cleanTitle = (title ?? "").trim();
  const cleanSpecs = (specs ?? []).map((s) => s.trim()).filter(Boolean);
  return [cleanTitle, ...cleanSpecs].join("\n");
};

/** True si la description contient une liste de composants détaillée. */
export const hasEquipmentSpecs = (raw?: string | null): boolean =>
  parseEquipmentDescription(raw).specs.length > 0;
