// Versioning de Leazr : source unique pour la modale « Nouveautés » affichée au
// chargement après un déploiement. Ajouter une entrée EN TÊTE du tableau CHANGELOG
// et bumper APP_VERSION à chaque lot de modifications déployées.

export const APP_VERSION = "1.0.0";

export interface ChangelogEntry {
  version: string;
  date: string; // ISO YYYY-MM-DD
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-06-18",
    title: "Espace client enrichi : documents, multi-utilisateurs & demande de factures",
    items: [
      "Nouveau centre de documents dans l'espace client : retrouvez vos contrats signés et tous les documents liés à vos contrats.",
      "Multi-utilisateurs par client : donnez l'accès à l'espace client à plusieurs collaborateurs d'une même société.",
      "Demande de factures au bailleur directement depuis un contrat, avec un éditeur d'e-mail complet modifiable avant l'envoi.",
    ],
  },
];

// Comparaison sémantique « a.b.c » : > 0 si version a plus récente que b.
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}
