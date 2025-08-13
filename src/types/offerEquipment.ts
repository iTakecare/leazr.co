
export interface OfferEquipment {
  id: string;
  offer_id: string;
  title: string;
  purchase_price: number;
  quantity: number;
  margin: number;
  monthly_payment?: number;
  serial_number?: string;
  // Delivery information fields
  collaborator_id?: string;
  delivery_site_id?: string;
  delivery_type?: 'main_client' | 'collaborator' | 'predefined_site' | 'specific_address';
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_country?: string;
  delivery_contact_name?: string;
  delivery_contact_email?: string;
  delivery_contact_phone?: string;
  created_at?: string;
  updated_at?: string;
  attributes?: OfferEquipmentAttribute[];
  specifications?: OfferEquipmentSpecification[];
}

export interface OfferEquipmentAttribute {
  id?: string;
  equipment_id: string;
  key: string;
  value: string;
  created_at?: string;
}

export interface OfferEquipmentSpecification {
  id?: string;
  equipment_id: string;
  key: string;
  value: string;
  created_at?: string;
}
