/**
 * Construit une query enrichie pour le sourcing à partir du title + attributs
 * d'un offer_equipment ou contract_equipment.
 *
 * Exemple :
 *   title = "MacBook Pro 14 M4"
 *   attrs = { CPU: "M4", Mémoire: "16Go", "Disque Dur": "512Go", Couleur: "Argent" }
 *   → "MacBook Pro 14 M4 16Go 512Go Argent"
 *
 * Règles :
 *  - On ne duplique pas les valeurs déjà présentes dans le title
 *  - On exclut certaines clés peu utiles pour la recherche fournisseur
 *    (garantie, poids, dimensions internes, etc.)
 *  - Ordre : title + RAM + stockage + CPU + taille/écran + couleur + autres
 */
import { supabase } from "@/integrations/supabase/client";

/** Clés d'attributs à ignorer pour la recherche (pas discriminantes) */
const IGNORED_KEYS = new Set(
  [
    "garantie",
    "warranty",
    "poids",
    "weight",
    "dimensions",
    "batterie",
    "battery",
    "port",
    "ports",
    "norme",
    "certification",
    "référence",
    "reference",
    "sku",
    "ean",
    "gtin",
    "fournisseur",
    "supplier",
    "livraison",
    "delivery",
  ].map((s) => s.toLowerCase())
);

/**
 * Ordre de priorité des clés : les premières apparaissent d'abord dans la query.
 * La comparaison se fait en lowercase + sans accents.
 */
const PRIORITY_ORDER: string[] = [
  "cpu",
  "processeur",
  "processor",
  "chip",
  "puce",
  "ram",
  "memoire",
  "memory",
  "disque dur",
  "stockage",
  "storage",
  "capacite",
  "ssd",
  "hdd",
  "ecran",
  "display",
  "screen",
  "taille",
  "resolution",
  "couleur",
  "color",
];

function normalizeKey(k: string): string {
  return k
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function priorityIndex(key: string): number {
  const norm = normalizeKey(key);
  const idx = PRIORITY_ORDER.indexOf(norm);
  return idx === -1 ? 999 : idx;
}

export interface EquipmentForSourcing {
  id: string;
  title: string;
  source_type: "offer" | "contract";
}

/**
 * Récupère les attributs d'un équipement et construit une query enrichie.
 *
 * Retourne un objet { query, specs } où :
 *  - query : string concaténée utilisable pour buildSearchUrls
 *  - specs : dict des attributs pertinents (pour affichage ou autre)
 */
export async function buildQueryFromEquipment(
  equipment: EquipmentForSourcing
): Promise<{ query: string; specs: Record<string, string> }> {
  const attrTable =
    equipment.source_type === "offer"
      ? "offer_equipment_attributes"
      : "contract_equipment_attributes";

  const { data, error } = await supabase
    .from(attrTable)
    .select("key, value")
    .eq("equipment_id", equipment.id);

  if (error) {
    console.warn("[buildQueryFromEquipment] Fetch attrs failed:", error);
    return { query: equipment.title, specs: {} };
  }

  const specs: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
    if (!row.key || !row.value) continue;
    const normKey = normalizeKey(row.key);
    if (IGNORED_KEYS.has(normKey)) continue;
    specs[row.key] = row.value;
  }

  // Trier par priorité puis par ordre alphabétique
  const sortedEntries = Object.entries(specs).sort(([ka], [kb]) => {
    const pa = priorityIndex(ka);
    const pb = priorityIndex(kb);
    if (pa !== pb) return pa - pb;
    return ka.localeCompare(kb);
  });

  const titleLower = equipment.title.toLowerCase();
  const titleTokens = titleLower.split(/\s+/).map((t) => t.toLowerCase());

  const parts: string[] = [equipment.title.trim()];
  for (const [, value] of sortedEntries) {
    const v = value.trim();
    if (!v) continue;
    const vLower = v.toLowerCase();
    // Éviter les doublons : si la valeur (ou l'un de ses tokens) est déjà
    // présente mot-à-mot dans le title, on skip
    const vTokens = vLower.split(/\s+/);
    const allAlreadyInTitle = vTokens.every(
      (t) => t.length < 2 || titleTokens.some((tt) => tt === t || tt.includes(t))
    );
    if (allAlreadyInTitle) continue;
    parts.push(v);
  }

  return { query: parts.join(" "), specs };
}
