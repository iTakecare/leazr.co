
export interface Equipment {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  monthlyPayment?: number;
  attributes?: Record<string, any>; // Attributs sélectionnés (couleur, taille, etc.)
  specifications?: Record<string, any>; // Spécifications techniques du produit
  
  // Nouveaux champs pour la gestion d'inventaire
  serial_number?: string;
  location?: string;
  status?: 'available' | 'assigned' | 'maintenance' | 'retired' | 'missing';
  assigned_to?: string;
  warranty_end_date?: Date | string;
  purchase_date?: Date | string;
  last_maintenance_date?: Date | string;
  next_maintenance_date?: Date | string;
}

// Types pour les nouvelles fonctionnalités d'inventaire
export interface EquipmentTracking {
  id: string;
  equipment_id: string;
  movement_type: 'in' | 'out' | 'transfer' | 'maintenance' | 'return' | 'status_change' | 'location_change' | 'assignment';
  from_location?: string;
  to_location?: string;
  from_user_id?: string;
  to_user_id?: string;
  notes?: string;
  created_by: string;
  company_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EquipmentMaintenance {
  id: string;
  equipment_id: string;
  maintenance_type: 'preventive' | 'corrective' | 'inspection';
  description: string;
  scheduled_date?: Date | string;
  completed_date?: Date | string;
  performed_by?: string;
  cost?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_by: string;
  company_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EquipmentRequest {
  id: string;
  equipment_id?: string;
  requester_id: string;
  request_type: 'assignment' | 'transfer' | 'maintenance' | 'purchase';
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description?: string;
  justification?: string;
  requested_date?: Date | string;
  approved_by?: string;
  approved_at?: Date | string;
  rejection_reason?: string;
  estimated_cost?: number;
  company_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EquipmentAlert {
  id: string;
  equipment_id?: string;
  alert_type: 'maintenance_due' | 'warranty_expiring' | 'overdue_return' | 'location_change';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  is_read: boolean;
  is_dismissed: boolean;
  target_user_id?: string;
  company_id: string;
  created_at: Date | string;
  read_at?: Date | string;
  dismissed_at?: Date | string;
}

export interface Leaser {
  id: string;
  name: string;
  company_name?: string;
  logo_url?: string;
  ranges: LeasingRange[];
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
  phone?: string;
  email?: string;
}

export interface LeasingRange {
  id: string;
  min: number;
  max: number;
  coefficient: number;
}

export interface LeaserRange {
  id: string;
  min: number;
  max: number;
  coefficient: number;
}

export interface GlobalMarginAdjustment {
  percentage: number;
  amount: number;
  newMonthly: number;
  currentCoef: number;
  newCoef: number;
  adaptMonthlyPayment: boolean;
  marginDifference: number;
}
