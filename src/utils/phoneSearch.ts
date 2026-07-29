// Recherche téléphonique tolérante pour les listes CRM.
// Un numéro stocké peut être "0493298654", "+32 493 29 86 54", "p:+32493298654"…
// et l'utilisateur peut taper n'importe quelle variante, même partielle :
// on compare uniquement les chiffres, en égalisant les préfixes nationaux /
// internationaux (0479… ≡ +32479… ≡ 0032479…), en sous-chaîne pour que les
// résultats s'affinent au fur et à mesure de la frappe.

const onlyDigits = (v: string): string => v.replace(/\D/g, "");

const prefixVariants = (d: string): string[] => {
  const out = new Set([d]);
  if (d.startsWith("00")) out.add(d.slice(2)); // 0032… → 32…
  if (d.startsWith("32")) out.add("0" + d.slice(2)); // 32479… → 0479…
  if (d.startsWith("0") && !d.startsWith("00")) {
    out.add("32" + d.slice(1)); // 0479… → 32479…
    out.add(d.slice(1)); // 0479… → 479… (pays inconnu : suffixe)
  }
  return [...out].filter(Boolean);
};

/** True si `term` ressemble à une recherche de téléphone (chiffres + séparateurs usuels). */
export const isPhoneSearchTerm = (term: string): boolean => {
  const cleaned = term.replace(/[\s+\-./()]/g, "");
  return cleaned.length >= 3 && /^\d+$/.test(cleaned);
};

/** Match partiel et normalisé d'un numéro stocké contre un terme de recherche. */
export const matchesPhoneSearch = (
  phone: string | null | undefined,
  term: string,
): boolean => {
  if (!phone || !isPhoneSearchTerm(term)) return false;
  const phoneDigits = onlyDigits(phone);
  if (!phoneDigits) return false;
  const phoneVariants = prefixVariants(phoneDigits);
  const termVariants = prefixVariants(onlyDigits(term));
  return phoneVariants.some((p) => termVariants.some((t) => p.includes(t)));
};
