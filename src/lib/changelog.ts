// Versioning de Leazr : sources des modales « Nouveautés » et des historiques
// d'aide. DEUX changelogs distincts selon l'audience :
//   - ADMIN_CHANGELOG  : équipe / société (espace /admin)
//   - CLIENT_CHANGELOG : clients finaux (espace /client)
// À chaque lot déployé, ajouter une entrée EN TÊTE du bon tableau et bumper la
// version correspondante (ADMIN_VERSION / CLIENT_VERSION).

export interface ChangelogEntry {
  version: string;
  date: string; // ISO YYYY-MM-DD
  title: string;
  items: string[];
}

// ─────────────────────────── ADMIN (espace /admin) ───────────────────────────
export const ADMIN_VERSION = "1.0.0";

export const ADMIN_CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-06-18",
    title: "Espace client enrichi : documents, multi-utilisateurs & demande de factures",
    items: [
      "Centre de documents dans l'espace client : vos clients retrouvent leurs contrats signés et tous les documents liés à leurs contrats.",
      "Multi-utilisateurs par client : un client peut donner accès à son espace à plusieurs de ses collaborateurs.",
      "Demande de factures au bailleur depuis un contrat, avec un éditeur d'e-mail complet modifiable avant l'envoi.",
    ],
  },
];

// ────────────────────────── CLIENT (espace /client) ──────────────────────────
export const CLIENT_VERSION = "1.0.0";

export const CLIENT_CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-06-18",
    title: "Votre espace client s'enrichit",
    items: [
      "Nouveau centre de documents : retrouvez vos contrats signés et tous les documents liés à vos contrats en un seul endroit.",
      "Plusieurs accès pour votre société : invitez vos collaborateurs à accéder à votre espace client.",
      "Demandez vos factures directement depuis un contrat, avec un e-mail pré-rempli que vous pouvez relire avant l'envoi.",
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
