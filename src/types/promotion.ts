export type PromotionPlacement = "top" | "sidebar";

export interface ClientPromotion {
  id: string;
  company_id: string;
  placement: PromotionPlacement;
  title: string;
  description?: string | null;
  image_url?: string | null;
  cta_label?: string | null;
  link_url?: string | null;
  /** Optionnel : dégradé/couleur de fond pour les bannières "top". */
  background?: string | null;
  is_active: boolean;
  sort_order: number;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ClientPromotionInput = Omit<
  ClientPromotion,
  "id" | "company_id" | "created_at" | "updated_at"
>;
