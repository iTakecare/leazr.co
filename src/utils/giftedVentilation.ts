/**
 * Ventilation du prix d'achat des produits offerts.
 *
 * Règle métier (cf. mémoire projet "gifted-products-ventilation") :
 * - Une ligne offerte (isGifted) a un prix de vente / mensualité nuls pour le client.
 * - Son prix d'achat (réel) est réparti à 100% sur les lignes payantes dont la
 *   catégorie est marquée "absorbe les offerts" (PC / laptop / tablette), au
 *   prorata de leur prix d'achat de base.
 * - Fallback : si aucune ligne éligible, tout le coût est imputé sur la ligne
 *   payante au prix d'achat de base le plus élevé.
 * - Le PRIX DE VENTE (donc la mensualité) de chaque ligne reste figé. Seul le
 *   prix d'achat des lignes absorbantes augmente → leur marge % baisse. La marge
 *   totale diminue du coût des offerts.
 */

export interface VentilationLine {
  id: string;
  categoryId?: string | null;
  isGifted: boolean;
  /** Prix d'achat unitaire AVANT ventilation. */
  basePurchasePrice: number;
  /** Prix de vente unitaire (ancre figée). 0 pour une ligne offerte. */
  sellingPrice: number;
  quantity: number;
}

export interface VentilationResult {
  id: string;
  /** Prix d'achat unitaire APRÈS ventilation. */
  effectivePurchasePrice: number;
  /** Marge % recalculée (prix de vente figé / prix d'achat effectif). */
  margin: number;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const safeQty = (q: number): number => (q && q > 0 ? q : 1);

/** Marge % à partir d'un prix de vente et d'un prix d'achat unitaires. */
const marginFromPrices = (sellingUnit: number, purchaseUnit: number): number => {
  if (purchaseUnit <= 0) return 0;
  return ((sellingUnit - purchaseUnit) / purchaseUnit) * 100;
};

/**
 * Calcule, pour chaque ligne, le prix d'achat unitaire effectif et la marge %
 * après ventilation du coût des produits offerts.
 */
export const ventilateGiftedCosts = (
  lines: VentilationLine[],
  absorbingCategoryIds: Set<string>
): VentilationResult[] => {
  // Coût total des offerts (sur la base du prix d'achat de base × quantité).
  const totalGiftedCost = lines
    .filter((l) => l.isGifted)
    .reduce((sum, l) => sum + l.basePurchasePrice * safeQty(l.quantity), 0);

  // Résultat par défaut : pas de ventilation.
  const baseline = (l: VentilationLine): VentilationResult => {
    if (l.isGifted) {
      return { id: l.id, effectivePurchasePrice: 0, margin: 0 };
    }
    return {
      id: l.id,
      effectivePurchasePrice: l.basePurchasePrice,
      margin: marginFromPrices(l.sellingPrice, l.basePurchasePrice),
    };
  };

  if (totalGiftedCost <= 0) {
    return lines.map(baseline);
  }

  const paidLines = lines.filter((l) => !l.isGifted);

  // Lignes éligibles : catégorie absorbante. Fallback : ligne payante la plus chère.
  let eligible = paidLines.filter(
    (l) => l.categoryId != null && absorbingCategoryIds.has(l.categoryId)
  );

  if (eligible.length === 0 && paidLines.length > 0) {
    const mostExpensive = paidLines.reduce((best, l) =>
      l.basePurchasePrice * safeQty(l.quantity) > best.basePurchasePrice * safeQty(best.quantity)
        ? l
        : best
    );
    eligible = [mostExpensive];
  }

  // Aucune ligne payante pour absorber : on ne peut rien ventiler.
  if (eligible.length === 0) {
    return lines.map(baseline);
  }

  // Poids = prix d'achat de base total par ligne éligible.
  const weights = new Map<string, number>();
  let totalWeight = 0;
  for (const l of eligible) {
    const w = l.basePurchasePrice * safeQty(l.quantity);
    weights.set(l.id, w);
    totalWeight += w;
  }

  // Allocation totale (en €) par ligne éligible.
  const allocation = new Map<string, number>();
  if (totalWeight > 0) {
    for (const l of eligible) {
      const share = (weights.get(l.id)! / totalWeight) * totalGiftedCost;
      allocation.set(l.id, round2(share));
    }
  } else {
    // Poids nuls (prix d'achat 0) : répartition égale entre les lignes éligibles.
    const equal = round2(totalGiftedCost / eligible.length);
    for (const l of eligible) allocation.set(l.id, equal);
  }

  // Réconciliation des arrondis : le reliquat va sur la ligne de plus gros poids.
  const allocatedSum = round2(
    Array.from(allocation.values()).reduce((s, v) => s + v, 0)
  );
  const remainder = round2(totalGiftedCost - allocatedSum);
  if (remainder !== 0) {
    const heaviest = eligible.reduce((best, l) =>
      (weights.get(l.id) ?? 0) > (weights.get(best.id) ?? 0) ? l : best
    );
    allocation.set(heaviest.id, round2((allocation.get(heaviest.id) ?? 0) + remainder));
  }

  return lines.map((l) => {
    if (l.isGifted) {
      return { id: l.id, effectivePurchasePrice: 0, margin: 0 };
    }
    const alloc = allocation.get(l.id);
    if (!alloc) {
      return baseline(l);
    }
    const qty = safeQty(l.quantity);
    const effectiveTotal = l.basePurchasePrice * qty + alloc;
    const effectiveUnit = round2(effectiveTotal / qty);
    return {
      id: l.id,
      effectivePurchasePrice: effectiveUnit,
      margin: marginFromPrices(l.sellingPrice, effectiveUnit),
    };
  });
};

/** Set des IDs de catégories absorbantes à partir d'une liste de catégories. */
export const buildAbsorbingCategorySet = (
  categories: Array<{ id: string; absorbs_gifted_cost?: boolean | null }>
): Set<string> =>
  new Set(categories.filter((c) => c.absorbs_gifted_cost).map((c) => c.id));

/**
 * Forme minimale d'une ligne d'équipement du calculateur nécessaire à la ventilation.
 * Compatible avec le type `Equipment` (camelCase) du calculateur.
 */
interface VentilatableEquipment {
  id: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  monthlyPayment?: number;
  categoryId?: string;
  isGifted?: boolean;
  basePurchasePrice?: number;
  sellingPrice?: number;
}

/**
 * Applique la ventilation à une liste d'équipements du calculateur et renvoie une
 * NOUVELLE liste avec les valeurs effectives :
 * - lignes offertes : purchasePrice = 0, margin = 0, monthlyPayment = 0
 *   (basePurchasePrice conserve le coût réel pour l'affichage barré)
 * - lignes absorbantes : purchasePrice = effectif, margin recalculée
 * - autres lignes : inchangées
 *
 * GARANTIE DE NON-RÉGRESSION : si aucune ligne n'est offerte, la liste d'origine
 * est renvoyée telle quelle (même référence), donc aucun comportement ne change.
 */
export const applyVentilationToEquipmentList = <T extends VentilatableEquipment>(
  equipmentList: T[],
  absorbingCategoryIds: Set<string>
): T[] => {
  if (!equipmentList.some((e) => e.isGifted)) {
    return equipmentList;
  }

  const lines: VentilationLine[] = equipmentList.map((e) => ({
    id: e.id,
    categoryId: e.categoryId ?? null,
    isGifted: !!e.isGifted,
    basePurchasePrice: e.basePurchasePrice ?? e.purchasePrice,
    sellingPrice: e.isGifted
      ? 0
      : round2((e.basePurchasePrice ?? e.purchasePrice) * (1 + e.margin / 100)),
    quantity: e.quantity,
  }));

  const results = ventilateGiftedCosts(lines, absorbingCategoryIds);
  const byId = new Map(results.map((r) => [r.id, r]));

  return equipmentList.map((e) => {
    const r = byId.get(e.id);
    const base = e.basePurchasePrice ?? e.purchasePrice;
    if (e.isGifted) {
      return {
        ...e,
        basePurchasePrice: base,
        purchasePrice: 0,
        margin: 0,
        monthlyPayment: 0,
        sellingPrice: 0,
      };
    }
    if (!r) return { ...e, basePurchasePrice: base };
    return {
      ...e,
      basePurchasePrice: base,
      purchasePrice: r.effectivePurchasePrice,
      margin: r.margin,
      sellingPrice: round2(r.effectivePurchasePrice * (1 + r.margin / 100)),
    };
  });
};
