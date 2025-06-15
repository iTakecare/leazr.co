import { supabase } from "@/integrations/supabase/client";

// Types pour les paramètres d'entreprise
export interface CompanyBranding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  favicon_url?: string;
  custom_domain?: string;
}

export interface CompanySettings {
  category: string;
  key: string;
  value: any;
}

export interface CompanyEmailTemplate {
  id: string;
  template_type: string;
  subject: string;
  html_content: string;
  variables: string[];
  is_active: boolean;
}

/**
 * Service pour gérer les paramètres et la personnalisation des entreprises
 */
export class CompanyCustomizationService {
  
  /**
   * Récupère les informations de branding d'une entreprise
   */
  static async getCompanyBranding(companyId: string): Promise<CompanyBranding | null> {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          primary_color,
          secondary_color,
          accent_color,
          logo_url,
          favicon_url,
          custom_domain
        `)
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Erreur lors de la récupération du branding:", error);
      return null;
    }
  }

  /**
   * Met à jour les paramètres de branding d'une entreprise
   */
  static async updateCompanyBranding(companyId: string, branding: Partial<CompanyBranding>) {
    try {
      const { error } = await supabase
        .from("companies")
        .update(branding)
        .eq("id", companyId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du branding:", error);
      throw error;
    }
  }

  /**
   * Récupère tous les paramètres d'une entreprise
   */
  static async getCompanySettings(companyId: string, category?: string): Promise<CompanySettings[]> {
    try {
      const { data, error } = await supabase.rpc("get_company_settings", {
        p_company_id: companyId,
        p_category: category
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Erreur lors de la récupération des paramètres:", error);
      return [];
    }
  }

  /**
   * Met à jour un paramètre d'entreprise
   */
  static async setCompanySetting(
    companyId: string,
    category: string,
    key: string,
    value: any
  ) {
    try {
      const { error } = await supabase.rpc("set_company_setting", {
        p_company_id: companyId,
        p_category: category,
        p_key: key,
        p_value: value
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du paramètre:", error);
      throw error;
    }
  }

  /**
   * Upload un asset pour une entreprise (logo, favicon, etc.)
   */
  static async uploadCompanyAsset(
    companyId: string,
    file: File,
    assetType: string
  ): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${companyId}/${assetType}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, {
          upsert: true
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Erreur lors de l'upload de l'asset:", error);
      return null;
    }
  }

  /**
   * Récupère les templates d'email d'une entreprise
   */
  static async getCompanyEmailTemplates(companyId: string): Promise<CompanyEmailTemplate[]> {
    try {
      const { data, error } = await supabase
        .from("company_email_templates")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Erreur lors de la récupération des templates email:", error);
      return [];
    }
  }

  /**
   * Met à jour un template d'email d'entreprise
   */
  static async updateCompanyEmailTemplate(
    companyId: string,
    templateType: string,
    template: Partial<CompanyEmailTemplate>
  ) {
    try {
      const { error } = await supabase
        .from("company_email_templates")
        .upsert({
          company_id: companyId,
          template_type: templateType,
          ...template,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "company_id,template_type"
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du template email:", error);
      throw error;
    }
  }

  /**
   * Applique le branding CSS personnalisé
   */
  static applyCompanyBranding(branding: CompanyBranding) {
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
  }

  /**
   * Génère le CSS personnalisé pour une entreprise
   */
  static generateCustomCSS(branding: CompanyBranding): string {
    return `
      :root {
        --primary: ${branding.primary_color};
        --secondary: ${branding.secondary_color};
        --accent: ${branding.accent_color};
      }
      
      .company-primary { color: ${branding.primary_color}; }
      .company-secondary { color: ${branding.secondary_color}; }
      .company-accent { color: ${branding.accent_color}; }
      
      .bg-company-primary { background-color: ${branding.primary_color}; }
      .bg-company-secondary { background-color: ${branding.secondary_color}; }
      .bg-company-accent { background-color: ${branding.accent_color}; }
    `;
  }
}

export default CompanyCustomizationService;