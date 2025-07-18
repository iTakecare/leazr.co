
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { invalidateSettingsCache } from '@/hooks/useSiteSettings';

export interface SiteSettings {
  id?: string;
  company_id?: string;
  company_name: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Récupère les paramètres de l'entreprise actuelle
 */
export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  try {
    // D'abord récupérer l'ID de l'entreprise de l'utilisateur
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (profileError || !userProfile?.company_id) {
      console.error("Erreur lors de la récupération du profil utilisateur:", profileError);
      return null;
    }

    const { data, error } = await supabase
      .from('company_customizations')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .maybeSingle();
    
    if (error) {
      console.error("Erreur lors de la récupération des paramètres d'entreprise:", error);
      return null;
    }
    
    return data as SiteSettings;
  } catch (error) {
    console.error("Exception lors de la récupération des paramètres:", error);
    return null;
  }
};

/**
 * Met à jour les paramètres de l'entreprise
 */
export const updateSiteSettings = async (settings: Partial<SiteSettings>): Promise<boolean> => {
  try {
    // Récupérer l'ID de l'entreprise de l'utilisateur
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (profileError || !userProfile?.company_id) {
      console.error("Erreur lors de la récupération du profil utilisateur:", profileError);
      toast.error("Impossible de récupérer les informations de l'entreprise");
      return false;
    }

    // Utiliser upsert pour créer ou mettre à jour les paramètres de l'entreprise
    const { error } = await supabase
      .from('company_customizations')
      .upsert({
        company_id: userProfile.company_id,
        company_name: settings.company_name,
        company_address: settings.company_address,
        company_phone: settings.company_phone,
        company_email: settings.company_email,
        logo_url: settings.logo_url,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id'
      });
    
    if (error) {
      console.error("Erreur lors de la mise à jour des paramètres d'entreprise:", error);
      toast.error("Erreur lors de la mise à jour des paramètres");
      return false;
    }
    
    // Invalider le cache après une mise à jour réussie
    invalidateSettingsCache();
    
    toast.success("Paramètres mis à jour avec succès");
    return true;
  } catch (error) {
    console.error("Exception lors de la mise à jour des paramètres:", error);
    toast.error("Erreur lors de la mise à jour des paramètres");
    return false;
  }
};
