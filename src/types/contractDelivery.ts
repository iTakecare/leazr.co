export interface ContractEquipmentDelivery {
  id: string;
  contract_equipment_id: string;
  quantity: number;
  serial_numbers: string[];
  delivery_type: 'main_client' | 'collaborator' | 'predefined_site' | 'specific_address';
  collaborator_id?: string;
  delivery_site_id?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_country?: string;
  delivery_contact_name?: string;
  delivery_contact_email?: string;
  delivery_contact_phone?: string;
  notes?: string;
  status: 'pending' | 'prepared' | 'shipped' | 'delivered' | 'cancelled';
  delivery_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContractEquipmentDelivery {
  contract_equipment_id: string;
  quantity: number;
  serial_numbers?: string[];
  delivery_type: 'main_client' | 'collaborator' | 'predefined_site' | 'specific_address';
  collaborator_id?: string;
  delivery_site_id?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_country?: string;
  delivery_contact_name?: string;
  delivery_contact_email?: string;
  delivery_contact_phone?: string;
  notes?: string;
  delivery_date?: string;
}

// Configuration pour une livraison individuelle
export interface EquipmentDeliveryConfig {
  equipmentId: string;
  equipmentTitle: string;
  totalQuantity: number;
  hasSerialNumbers: boolean;
  serialNumbers: string[];
  deliveryItems: EquipmentDeliveryItem[];
}

// Item individuel de livraison
export interface EquipmentDeliveryItem {
  id?: string; // Pour les items existants
  quantity: number;
  serialNumbers: string[];
  deliveryType: 'main_client' | 'collaborator' | 'predefined_site' | 'specific_address';
  collaboratorId?: string;
  deliverySiteId?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  deliveryCountry?: string;
  deliveryContactName?: string;
  deliveryContactEmail?: string;
  deliveryContactPhone?: string;
  notes?: string;
}

// Options pour le mode de livraison
export type DeliveryMode = 'single' | 'split_quantity' | 'individual_serial';