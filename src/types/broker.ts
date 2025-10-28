export interface Broker {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  modules_enabled?: string[];
  company_type: 'broker';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrokerContextType {
  broker: Broker | null;
  brokerId: string | null;
  brokerSlug: string | null;
  loading: boolean;
  refresh: () => void;
}
