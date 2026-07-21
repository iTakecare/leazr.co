
import { supabase, getFileUploadClient } from '@/integrations/supabase/client';

// Les couleurs de branding sont stockées en hex (#33638e) mais Tailwind consomme
// les variables via hsl(var(--primary)) : il faut donc injecter un triplet HSL
// « H S% L% », sinon la propriété est invalide et le fond devient transparent
// (texte blanc illisible sur fond blanc).
const parseColorToHsl = (color: string): { h: number; s: number; l: number } | null => {
  const c = color.trim();

  const hslTriple = c.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (hslTriple) {
    return { h: parseFloat(hslTriple[1]), s: parseFloat(hslTriple[2]), l: parseFloat(hslTriple[3]) };
  }

  let hex = c.match(/^#?([0-9a-f]{6})$/i)?.[1];
  if (!hex) {
    const short = c.match(/^#?([0-9a-f]{3})$/i)?.[1];
    if (short) hex = short.split('').map(ch => ch + ch).join('');
  }
  if (!hex) return null;

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 1000) / 10, l: Math.round(l * 1000) / 10 };
};

const setHslVariable = (variable: string, color: string): void => {
  const hsl = parseColorToHsl(color);
  if (!hsl) {
    console.warn(`🎨 CUSTOMIZATION SERVICE - Couleur illisible pour ${variable}:`, color);
    return;
  }
  const root = document.documentElement;
  root.style.setProperty(variable, `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  // Texte lisible quelle que soit la couleur choisie par le tenant :
  // foncé sur couleur claire, blanc sur couleur foncée.
  root.style.setProperty(`${variable}-foreground`, hsl.l > 60 ? '222 47% 11%' : '0 0% 100%');
};

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
      
      // getFileUploadClient() : sans header JSON global qui casse les uploads
      // + contentType: file.type (indispensable pour éviter Invalid Content-Type)
      const { data, error } = await getFileUploadClient().storage
        .from('company-assets')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type || 'application/octet-stream'
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

    if (branding.primary_color) {
      setHslVariable('--primary', branding.primary_color);
    }

    if (branding.secondary_color) {
      setHslVariable('--secondary', branding.secondary_color);
    }

    if (branding.accent_color) {
      setHslVariable('--accent', branding.accent_color);
    }

    // Apply favicon dynamically
    if (branding.favicon_url) {
      this.applyFavicon(branding.favicon_url);
    }

    console.log("🎨 CUSTOMIZATION SERVICE - Branding appliqué avec succès");
  }

  static applyFavicon(faviconUrl: string): void {
    if (!faviconUrl) return;
    
    console.log("🎨 CUSTOMIZATION SERVICE - Application de la favicon:", faviconUrl);
    
    // Remove existing favicons
    const existingFavicons = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']");
    existingFavicons.forEach(el => el.remove());
    
    // Create new favicon link
    const faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.href = faviconUrl;
    
    // Detect type based on extension
    if (faviconUrl.endsWith('.ico')) {
      faviconLink.type = 'image/x-icon';
    } else if (faviconUrl.endsWith('.svg')) {
      faviconLink.type = 'image/svg+xml';
    } else {
      faviconLink.type = 'image/png';
    }
    
    document.head.appendChild(faviconLink);
    console.log("🎨 CUSTOMIZATION SERVICE - Favicon appliquée avec succès");
  }
}

export default CompanyCustomizationService;
