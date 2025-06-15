
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SiteSettings {
  id?: number;
  site_name?: string;
  site_description?: string;
  company_name: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Récupère les paramètres du site - Version simplifiée sans authentification
 */
export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  try {
    console.log("=== RÉCUPÉRATION PARAMÈTRES SANS AUTH ===");
    
    // Requête directe sans vérification d'auth
    const { data, error } = await supabase
      .from('site_settings')
      .select('id, site_name, site_description, company_name, company_address, company_phone, company_email, logo_url, created_at, updated_at')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error("Erreur récupération:", error);
      return null;
    }
    
    console.log("Paramètres récupérés:", data);
    return data as SiteSettings;
  } catch (error) {
    console.error("Exception récupération:", error);
    return null;
  }
};

/**
 * Met à jour les paramètres - Version ultra-simplifiée
 */
export const updateSiteSettings = async (settings: Partial<SiteSettings>): Promise<boolean> => {
  try {
    console.log("=== DÉBUT MISE À JOUR ISOLÉE ===", settings);
    
    // Vérifier s'il y a déjà des paramètres
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (existing && existing.id) {
      console.log("Mise à jour des paramètres existants ID:", existing.id);
      
      // Mise à jour simple sans références externes
      const { error } = await supabase
        .from('site_settings')
        .update({
          site_name: settings.site_name || 'Leazr',
          site_description: settings.site_description || 'Hub de gestion',
          company_name: settings.company_name || '',
          company_address: settings.company_address || '',
          company_phone: settings.company_phone || '',
          company_email: settings.company_email || '',
          logo_url: settings.logo_url || ''
        })
        .eq('id', existing.id);
      
      if (error) {
        console.error("Erreur mise à jour:", error);
        toast.error(`Erreur: ${error.message}`);
        return false;
      }
    } else {
      console.log("Création de nouveaux paramètres");
      
      // Création simple sans références externes
      const { error } = await supabase
        .from('site_settings')
        .insert([{
          site_name: settings.site_name || 'Leazr',
          site_description: settings.site_description || 'Hub de gestion',
          company_name: settings.company_name || '',
          company_address: settings.company_address || '',
          company_phone: settings.company_phone || '',
          company_email: settings.company_email || '',
          logo_url: settings.logo_url || ''
        }]);
      
      if (error) {
        console.error("Erreur création:", error);
        toast.error(`Erreur: ${error.message}`);
        return false;
      }
    }

    console.log("=== SUCCÈS MISE À JOUR ===");
    toast.success("Paramètres sauvegardés avec succès");
    return true;
    
  } catch (error) {
    console.error("=== EXCEPTION MISE À JOUR ===", error);
    toast.error("Erreur lors de la sauvegarde");
    return false;
  }
};
