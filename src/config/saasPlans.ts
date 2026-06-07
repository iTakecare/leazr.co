/**
 * Source de vérité UNIQUE des plans d'abonnement SaaS Leazr.
 *
 * Avant ce fichier, la grille tarifaire était dupliquée et contradictoire dans
 * au moins 4 endroits (companyService.PLANS, SaaSPlansManager, CompanySubscriptionPage,
 * create-checkout). Tous ces consommateurs doivent désormais importer d'ici.
 *
 * Tarifs officiels (mensuel HT) : Starter 79 € · Pro 129 € · Business 199 €.
 * Facturation via Mollie (cf. edge function mollie-saas-subscribe).
 */

export type SaasPlanId = "starter" | "pro" | "business";

export interface SaasPlan {
  id: SaasPlanId;
  name: string;
  /** Prix mensuel HT en euros. */
  price: number;
  /** Prix en centimes — ce que Mollie attend. */
  priceCents: number;
  description: string;
  features: string[];
  /** Nombre max d'utilisateurs. -1 = illimité. */
  maxUsers: number;
  /** Nombre max de modules activables. -1 = illimité (tous). */
  maxModules: number;
  popular: boolean;
}

export const SAAS_PLANS: Record<SaasPlanId, SaasPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 79,
    priceCents: 7900,
    description: "Pour débuter",
    features: ["1 utilisateur", "1 module", "Support par email"],
    maxUsers: 1,
    maxModules: 1,
    popular: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 129,
    priceCents: 12900,
    description: "Pour grandir",
    features: ["5 utilisateurs", "3 modules", "Support prioritaire"],
    maxUsers: 5,
    maxModules: 3,
    popular: true,
  },
  business: {
    id: "business",
    name: "Business",
    price: 199,
    priceCents: 19900,
    description: "Pour l'entreprise",
    features: ["10 utilisateurs", "Tous les modules", "Support dédié"],
    maxUsers: 10,
    maxModules: -1,
    popular: false,
  },
};

/** Liste ordonnée (pour l'affichage des grilles tarifaires). */
export const SAAS_PLANS_LIST: SaasPlan[] = [
  SAAS_PLANS.starter,
  SAAS_PLANS.pro,
  SAAS_PLANS.business,
];

export const isSaasPlanId = (value: unknown): value is SaasPlanId =>
  typeof value === "string" && value in SAAS_PLANS;

/** Retourne le plan, avec repli sur Starter si la valeur est inconnue/nulle. */
export const getSaasPlan = (planId: string | null | undefined): SaasPlan =>
  isSaasPlanId(planId) ? SAAS_PLANS[planId] : SAAS_PLANS.starter;

/** Durée d'essai en jours (aligné avec create-company-with-admin / dataIsolationService). */
export const TRIAL_DURATION_DAYS = 14;
