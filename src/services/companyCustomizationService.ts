
import { supabase } from '@/integrations/supabase/client';

export interface CompanyBranding {
  id?: string;
  company_id: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  company_name?: string;
  created_at?: string;
  updated_at?: string;
}

class CompanyCustomizationService {
  static async getCompanyBranding(companyId: string): Promise<CompanyBranding | null> {
    console.log("🎨 CUSTOMIZATION SERVICE - getCompanyBranding pour:", companyId);
    
    try {
      const { data, error } = await supabase
        .from('company_customizations')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      console.log("🎨 CUSTOMIZATION SERVICE - Résultat requête:", { data, error });

      if (error) {
        console.error('🎨 CUSTOMIZATION SERVICE - Erreur lors de la récupération:', error);
        if (error.message?.includes('relation "company_customizations" does not exist')) {
          console.log('🎨 CUSTOMIZATION SERVICE - Table company_customizations non trouvée, retour null');
          return null;
        }
        throw error;
      }

      console.log("🎨 CUSTOMIZATION SERVICE - Données retournées:", data);
      return data;
    } catch (error) {
      console.error('🎨 CUSTOMIZATION SERVICE - Erreur dans getCompanyBranding:', error);
      return null;
    }
  }

  static async updateCompanyBranding(companyId: string, branding: Partial<CompanyBranding>): Promise<CompanyBranding> {
    console.log("🎨 CUSTOMIZATION SERVICE - updateCompanyBranding pour:", companyId, branding);
    
    const { data, error } = await supabase
      .from('company_customizations')
      .upsert({
        company_id: companyId,
        ...branding,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('🎨 CUSTOMIZATION SERVICE - Erreur lors de la mise à jour:', error);
      throw error;
    }

    console.log("🎨 CUSTOMIZATION SERVICE - Branding mis à jour:", data);
    return data;
  }

  static applyCompanyBranding(branding: CompanyBranding): void {
    console.log("🎨 CUSTOMIZATION SERVICE - Application du branding:", branding);
    
    if (!branding) return;

    const root = document.documentElement;

    if (branding.primary_color) {
      root.style.setProperty('--primary', branding.primary_color);
    }

    if (branding.secondary_color) {
      root.style.setProperty('--secondary', branding.secondary_color);
    }

    console.log("🎨 CUSTOMIZATION SERVICE - Branding appliqué avec succès");
  }
}

export default CompanyCustomizationService;
