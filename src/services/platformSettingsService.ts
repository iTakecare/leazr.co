import { supabase } from '@/integrations/supabase/client';

export interface PlatformSettings {
  id?: string;
  company_name: string;
  company_description?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  website_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  created_at?: string;
  updated_at?: string;
}

export const getPlatformSettings = async (): Promise<PlatformSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Erreur lors de la récupération des paramètres de plateforme:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres de plateforme:', error);
    return null;
  }
};

export const updatePlatformSettings = async (settings: PlatformSettings): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('platform_settings')
      .upsert(settings)
      .select();

    if (error) {
      console.error('Erreur lors de la mise à jour des paramètres de plateforme:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres de plateforme:', error);
    return false;
  }
};