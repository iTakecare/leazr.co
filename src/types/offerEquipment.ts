
export interface OfferEquipment {
  id: string;
  offer_id: string;
  title: string;
  purchase_price: number;
  quantity: number;
  margin: number;
  monthly_payment?: number;
  serial_number?: string;
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
