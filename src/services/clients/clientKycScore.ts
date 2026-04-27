/**
 * Calcul du score KYC interne (Option A : A / B / C / D).
 *
 * Logique :
 *  - D (rouge) : alertes BCE (faillite, liquidation, radiation, cessation),
 *    statut non actif, fonds propres < 0 ou perte nette > 50k €.
 *  - C (orange) : société < 12 mois OU activité minuscule (CA < 50k € ET 0–1 employé).
 *  - A (vert)  : société ≥ 36 mois, statut actif, pas d'alertes, indicateurs
 *    financiers connus et sains (fonds propres > 0 et résultat ≥ 0).
 *  - B (jaune) : tout le reste — typiquement société de 12-36 mois en bonne
 *    forme apparente mais sans données financières assez fortes pour le A.
 *
 * Pas de KYC validé → on retourne null (non évalué).
 */

import type { KycExtraction } from "./clientKycService";

export type KycScoreLetter = "A" | "B" | "C" | "D";

export interface KycScoreResult {
  letter: KycScoreLetter;
  reasons: string[];
}

const FAILURE_KEYWORDS = [
  "faillite",
  "liquidation",
  "radiation",
  "radié",
  "cessation",
  "cessé",
  "dissolution",
  "ceased",
  "bankrupt",
];

const SUSPECT_STATUS_KEYWORDS = [
  "non actif",
  "radié",
  "radiation",
  "ceased",
  "inactive",
];

interface ScoreInputs {
  /** Date de création de la société (ISO) ou null. */
  companyCreationDate: string | null | undefined;
  /** Type d'entité (societe / independant / asbl / autre). */
  entityType?: string | null;
  /** Dernière extraction validée (peut être null si jamais validé). */
  lastExtraction?: KycExtraction | null;
}

export function computeAgeMonths(creationDateIso: string | null | undefined): number | null {
  if (!creationDateIso) return null;
  const d = new Date(creationDateIso);
  if (isNaN(d.getTime())) return null;
  const now = Date.now();
  const diffMs = now - d.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
}

/** Retourne le score, ou null si pas assez de données pour calculer. */
export function computeClientKycScore(inputs: ScoreInputs): KycScoreResult | null {
  const { companyCreationDate, entityType, lastExtraction } = inputs;

  // Si on n'a aucune donnée KYC du tout, pas de score.
  if (!companyCreationDate && !lastExtraction && !entityType) {
    return null;
  }

  const ageMonths = computeAgeMonths(companyCreationDate ?? null);
  const warnings = lastExtraction?.warnings || [];
  const fin = lastExtraction?.financial_indicators;

  // ──── D : red flags ────
  const dReasons: string[] = [];

  for (const w of warnings) {
    const wLc = w.toLowerCase();
    if (FAILURE_KEYWORDS.some((k) => wLc.includes(k))) {
      dReasons.push(`Alerte BCE : ${w}`);
    } else if (SUSPECT_STATUS_KEYWORDS.some((k) => wLc.includes(k))) {
      dReasons.push(`Statut suspect : ${w}`);
    }
  }

  if (typeof fin?.equity === "number" && fin.equity < 0) {
    dReasons.push(`Fonds propres négatifs (${fin.equity.toLocaleString("fr-BE")} €)`);
  }
  if (typeof fin?.net_result === "number" && fin.net_result < -50000) {
    dReasons.push(`Perte nette importante (${fin.net_result.toLocaleString("fr-BE")} €)`);
  }

  if (dReasons.length > 0) {
    return { letter: "D", reasons: dReasons };
  }

  // ──── C : jeune entreprise ou activité très faible ────
  const cReasons: string[] = [];

  if (ageMonths !== null && ageMonths < 12) {
    cReasons.push(
      ageMonths === 0
        ? "Société créée il y a moins d'un mois"
        : `Société de ${ageMonths} mois (< 12 mois)`,
    );
  }

  const veryLowActivity =
    typeof fin?.revenue === "number" &&
    fin.revenue < 50000 &&
    typeof fin?.employees === "number" &&
    fin.employees <= 1;
  if (veryLowActivity) {
    cReasons.push(
      `Activité limitée (CA ${fin!.revenue!.toLocaleString("fr-BE")} €, ${fin!.employees} employé)`,
    );
  }

  if (cReasons.length > 0) {
    return { letter: "C", reasons: cReasons };
  }

  // ──── A : société établie + indicateurs sains ────
  const matureAndActive = ageMonths !== null && ageMonths >= 36;
  const positiveEquity = typeof fin?.equity === "number" && fin.equity > 0;
  const profitable =
    fin?.net_result === undefined ||
    fin?.net_result === null ||
    (typeof fin?.net_result === "number" && fin.net_result >= 0);

  if (matureAndActive && positiveEquity && profitable) {
    const aReasons = [
      `Société établie (${ageMonths} mois)`,
      `Fonds propres positifs (${fin!.equity!.toLocaleString("fr-BE")} €)`,
    ];
    if (typeof fin?.net_result === "number") {
      aReasons.push(
        fin.net_result > 0
          ? `Résultat net positif (${fin.net_result.toLocaleString("fr-BE")} €)`
          : "Résultat net à l'équilibre",
      );
    }
    return { letter: "A", reasons: aReasons };
  }

  // ──── B : entre les deux ────
  const bReasons: string[] = [];
  if (ageMonths !== null) {
    if (ageMonths < 36) {
      bReasons.push(`Société de ${ageMonths} mois (entre 1 et 3 ans)`);
    } else {
      bReasons.push(`Société établie (${ageMonths} mois)`);
    }
  }
  if (warnings.length === 0 && (ageMonths === null || ageMonths >= 12)) {
    bReasons.push("Aucune alerte BCE détectée");
  }
  if (!fin || (fin.equity == null && fin.net_result == null && fin.revenue == null)) {
    bReasons.push("Indicateurs financiers détaillés non disponibles (lookup BCE seul)");
  }
  if (bReasons.length === 0) {
    bReasons.push("Pas d'élément critique identifié");
  }
  return { letter: "B", reasons: bReasons };
}

export const KYC_SCORE_LABELS: Record<KycScoreLetter, string> = {
  A: "Risque très faible",
  B: "Risque modéré",
  C: "Vigilance requise",
  D: "Risque élevé",
};

export const KYC_SCORE_COLORS: Record<KycScoreLetter, { bg: string; text: string; border: string; tone: string }> = {
  A: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", tone: "emerald" },
  B: { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-300", tone: "sky" },
  C: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", tone: "amber" },
  D: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", tone: "red" },
};
