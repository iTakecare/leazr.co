/**
 * Types partagés entre le content script, le background et la popup.
 */

export type ProductCondition =
  | "new"
  | "grade_a"
  | "grade_b"
  | "grade_c"
  | "unknown";

export type StockStatus =
  | "in_stock"
  | "limited"
  | "out_of_stock"
  | "unknown";

/** Offre capturée sur une page fournisseur, avant envoi à Leazr. */
export interface CapturedOffer {
  title: string;
  brand?: string;
  price_cents: number;
  currency: "EUR";
  delivery_cost_cents?: number;
  delivery_days_min?: number;
  delivery_days_max?: number;
  condition?: ProductCondition;
  warranty_months?: number;
  url: string;
  image_url?: string;
  stock_status: StockStatus;
  raw_specs?: Record<string, unknown>;
  /** Nom du site / host (pour matching avec la table suppliers) */
  captured_host: string;
}

/** Contexte envoyé par Leazr à l'extension via deeplink ou storage. */
export interface SourcingContext {
  type: "equipment_order_unit" | "contract_equipment" | "offer_equipment";
  target_id: string;
  label: string;          // ex: "MacBook Air M2 16/512"
  order_label?: string;   // ex: "Commande ITC-2026-OFF-5174"
  client_name?: string;
  set_at: string;         // ISO timestamp
  expires_at: string;     // ISO timestamp (24h après set_at)
}

/** Profil user + anonymisation info renvoyé par Leazr */
export interface LeazrProfile {
  user_id: string;
  email: string;
  role: string;           // 'admin' | 'super_admin' | 'sales_manager' | 'employee' | ...
  company_id: string;
  is_privileged: boolean; // admin || super_admin || sales_manager
}

/** Fournisseur renvoyé par sourcing-list-suppliers (éventuellement anonymisé) */
export interface SourcingSupplier {
  id: string;
  display_name: string;
  website: string | null;
  supports_refurbished: boolean;
  sourcing_adapter: string | null;
  logo_url: string | null;
  sourcing_enabled: boolean;
}

/** Résultat d'une capture : ce que l'adapter renvoie au content script */
export type AdapterResult =
  | { ok: true; offer: CapturedOffer }
  | { ok: false; reason: string };

/** Signature d'un adapter de site */
export interface SiteAdapter {
  /** Nom du site (debug, telemetry) */
  name: string;
  /** Clé stable utilisée pour le mapping côté Leazr (correspond à suppliers.sourcing_adapter) */
  key: string;
  /** Nom affiché dans la modale de résultats (jamais anonymisé côté admin) */
  displayName: string;
  /** Retourne true si cet adapter gère cette URL (utilisé par le content script) */
  matches: (url: URL) => boolean;
  /** Détecte si la page courante est une page produit (vs liste/home) */
  isProductPage: (doc: Document, url: URL) => boolean;
  /** Extrait l'offre depuis la page produit courante */
  extract: (doc: Document, url: URL) => AdapterResult;

  /** [Multi-source search] construit l'URL de la page de résultats pour une requête */
  buildSearchUrl?: (query: string) => string;
  /** [Multi-source search] extrait les N premiers résultats d'une page de listing */
  extractSearchResults?: (doc: Document, url: URL, limit?: number) => CapturedOffer[];
}

/** Requête de recherche envoyée depuis Leazr à l'extension */
export interface SearchRequest {
  type: "multi_source_search";
  query: string;
  limit_per_source?: number;       // top N par source (défaut 3)
  timeout_ms?: number;              // timeout global (défaut 20000)
  sources?: string[];               // clés d'adapters à interroger (toutes si non spécifié)
}

/** Progression envoyée par l'extension au fur et à mesure */
export type SearchProgressMessage =
  | { type: "search_started"; sources: string[] }
  | { type: "source_started"; source: string }
  | { type: "source_result"; source: string; offers: CapturedOffer[] }
  | { type: "source_failed"; source: string; error: string }
  | { type: "search_completed"; total_offers: number; duration_ms: number };

/** Réponse finale à un sendMessage simple (non-streaming) */
export interface SearchResponse {
  success: boolean;
  offers: Array<CapturedOffer & { source: string }>;
  errors: Array<{ source: string; error: string }>;
  duration_ms: number;
}

/** Messages entre content script / popup / background via chrome.runtime */
export type ExtensionMessage =
  | { type: "capture_current_page" }
  | { type: "page_offer_detected"; offer: CapturedOffer }
  | { type: "submit_offer"; offer: CapturedOffer; notes?: string }
  | { type: "context_updated"; context: SourcingContext | null }
  | { type: "auth_changed"; profile: LeazrProfile | null }
  | { type: "ping" }
  | { type: "handshake" }
  | SearchRequest;
