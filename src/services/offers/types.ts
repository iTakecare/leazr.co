
export interface EquipmentItem {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
}

export interface OfferData {
  client_name: string;
  client_email: string;
  client_id?: string;
  equipment_description?: string;
  amount: number;
  coefficient: number;
  monthly_payment: number;
  commission: number;
  user_id: string;
  type?: string;
  remarks?: string;
}

export interface RequestInfoData {
  offerId: string;
  requestedDocs: string[];
  customMessage: string;
  previousStatus: string;
}
