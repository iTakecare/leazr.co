
export interface Equipment {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  monthlyPayment?: number;
  attributes?: Record<string, any>; // Ajout des attributs
}

export interface Leaser {
  id: string;
  name: string;
  logo_url?: string;
  ranges: LeasingRange[];
}

export interface LeasingRange {
  id: string;
  min: number;
  max: number;
  coefficient: number;
}
