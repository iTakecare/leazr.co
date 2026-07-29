// Types du module financeur (Winlease) : tenant company_type='financeur',
// partenaires/brokers apporteurs et grilles de coefficients attribuables.

export interface Financeur {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  modules_enabled?: string[];
  company_type: 'financeur';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceurContextType {
  financeur: Financeur | null;
  financeurId: string | null;
  financeurSlug: string | null;
  loading: boolean;
  refresh: () => void;
}

export interface FinancingPartner {
  id: string;
  company_id: string;
  user_id?: string | null;
  partner_type: 'partner' | 'broker';
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  vat_number?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  status: string;
  coefficient_grid_id?: string | null;
  outstanding_limit?: number | null;
  notes?: string | null;
  has_user_account?: boolean;
  user_account_created_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CoefficientGrid {
  id: string;
  company_id: string;
  name: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  ranges?: CoefficientGridRange[];
}

export interface CoefficientGridRange {
  id?: string;
  grid_id?: string;
  min: number;
  max: number;
  duration_months: number;
  coefficient: number;
}

export interface FinancingRequestClient {
  id?: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  vat_number?: string;
  contact_name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

export interface FinancingRequestEquipmentLine {
  title: string;
  purchase_price: number;
  quantity: number;
}

/** Coefficient d'une grille pour un montant + durée donnés (même logique que le RPC serveur). */
export const getCoefficientFromGrid = (
  ranges: CoefficientGridRange[],
  amount: number,
  durationMonths: number
): number | null => {
  const match = ranges
    .filter(
      (r) =>
        amount >= Number(r.min) &&
        amount <= Number(r.max) &&
        Number(r.duration_months) === durationMonths
    )
    .sort((a, b) => Number(a.min) - Number(b.min))[0];
  return match ? Number(match.coefficient) : null;
};

/** Durées distinctes proposées par une grille, triées. */
export const getGridDurations = (ranges: CoefficientGridRange[]): number[] =>
  [...new Set(ranges.map((r) => Number(r.duration_months)))].sort((a, b) => a - b);
