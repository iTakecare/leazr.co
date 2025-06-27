
import { supabase } from '@/integrations/supabase/client';

export interface CompanyBranding {
  id?: string;
  company_id: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  favicon_url?: string;
  custom_domain?: string;
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

  static async uploadCompanyAsset(companyId: string, file: File, assetType: 'logo' | 'favicon'): Promise<string | null> {
    console.log("🎨 CUSTOMIZATION SERVICE - uploadCompanyAsset pour:", companyId, assetType);
    
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${companyId}/${assetType}.${fileExtension}`;
      
      const { data, error } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, {
          upsert: true
        });

      if (error) {
        console.error('🎨 CUSTOMIZATION SERVICE - Erreur upload:', error);
        throw error;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      console.log("🎨 CUSTOMIZATION SERVICE - Asset uploadé:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('🎨 CUSTOMIZATION SERVICE - Erreur dans uploadCompanyAsset:', error);
      return null;
    }
  }

  static async setCompanySetting(companyId: string, category: string, key: string, value: any): Promise<void> {
    console.log("🎨 CUSTOMIZATION SERVICE - setCompanySetting pour:", companyId, category, key, value);
    
    try {
      // For now, we'll store settings as part of the company_customizations table
      // In a more complex scenario, you might want a separate settings table
      const settingKey = `${category}_${key}`;
      
      const { error } = await supabase
        .from('company_customizations')
        .upsert({
          company_id: companyId,
          [settingKey]: value,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('🎨 CUSTOMIZATION SERVICE - Erreur lors de la sauvegarde du paramètre:', error);
        throw error;
      }

      console.log("🎨 CUSTOMIZATION SERVICE - Paramètre sauvegardé:", settingKey, value);
    } catch (error) {
      console.error('🎨 CUSTOMIZATION SERVICE - Erreur dans setCompanySetting:', error);
      throw error;
    }
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

    if (branding.accent_color) {
      root.style.setProperty('--accent', branding.accent_color);
    }

    console.log("🎨 CUSTOMIZATION SERVICE - Branding appliqué avec succès");
  }
}

export default CompanyCustomizationService;
