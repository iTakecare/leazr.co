import { supabase } from '@/integrations/supabase/client';
import { generateSlug } from '@/utils/slugs';

export interface CreateBrokerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  modules_enabled?: string[];
}

const DEFAULT_BROKER_MODULES = [
  'dashboard',
  'clients',
  'offers',
  'contracts',
  'analytics',
  'settings',
  'workflows',
  'leasers',
  'ambassadors'
];

export const brokerService = {
  /**
   * Créer un nouveau broker
   */
  async createBroker(data: CreateBrokerData) {
    try {
      // Générer le slug à partir du nom
      const slug = generateSlug(data.name);

      // Créer le broker dans la table companies
      const { data: broker, error } = await supabase
        .from('companies')
        .insert({
          name: data.name,
          slug,
          company_type: 'broker',
          modules_enabled: data.modules_enabled || DEFAULT_BROKER_MODULES,
          logo_url: data.logo_url,
          primary_color: data.primary_color || '#3b82f6',
          secondary_color: data.secondary_color || '#64748b',
          accent_color: data.accent_color || '#8b5cf6',
          is_active: true,
          plan: 'professional',
          account_status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: broker };
    } catch (error) {
      console.error('Error creating broker:', error);
      return { success: false, error };
    }
  },

  /**
   * Mettre à jour un broker
   */
  async updateBroker(brokerId: string, data: Partial<CreateBrokerData>) {
    try {
      const { data: broker, error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', brokerId)
        .eq('company_type', 'broker')
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: broker };
    } catch (error) {
      console.error('Error updating broker:', error);
      return { success: false, error };
    }
  },

  /**
   * Supprimer (désactiver) un broker
   */
  async deleteBroker(brokerId: string) {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: false })
        .eq('id', brokerId)
        .eq('company_type', 'broker');

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting broker:', error);
      return { success: false, error };
    }
  },

  /**
   * Récupérer un broker par ID
   */
  async getBrokerById(brokerId: string) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', brokerId)
        .eq('company_type', 'broker')
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching broker:', error);
      return { success: false, error };
    }
  },

  /**
   * Récupérer un broker par slug
   */
  async getBrokerBySlug(slug: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_broker_by_slug', { broker_slug: slug });

      if (error) throw error;

      return { success: true, data: data?.[0] || null };
    } catch (error) {
      console.error('Error fetching broker by slug:', error);
      return { success: false, error };
    }
  },

  /**
   * Récupérer tous les brokers
   */
  async getAllBrokers() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('company_type', 'broker')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching brokers:', error);
      return { success: false, error };
    }
  }
};
