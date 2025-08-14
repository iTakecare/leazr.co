import { supabase } from '@/integrations/supabase/client';

export interface DatabasePlatformSettings {
  setting_key: string;
  setting_value: Record<string, any>;
  setting_type: 'system' | 'company_default';
  description?: string;
  is_public: boolean;
}

export interface PlatformSettings {
  company_name: string;
  company_description?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  website_url?: string;
}

export interface CompanyDefaults {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  vat_number: string;
  phone: string;
  email: string;
  website: string;
}

export interface SupportContact {
  email: string;
  phone: string;
}

export interface PlatformBranding {
  platform_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

/**
 * Get a platform setting by key
 */
export const getPlatformSetting = async (key: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase.rpc('get_platform_setting', {
      p_setting_key: key
    });

    if (error) {
      console.error(`Error fetching platform setting ${key}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Exception fetching platform setting ${key}:`, error);
    return null;
  }
};

/**
 * Get aggregated platform settings in the format expected by components
 */
export const getPlatformSettings = async (): Promise<PlatformSettings | null> => {
  try {
    const [branding, defaultCompany, support] = await Promise.all([
      getPlatformSetting('platform_branding'),
      getPlatformSetting('default_company_info'),
      getPlatformSetting('support_contact')
    ]);

    return {
      company_name: branding?.platform_name || 'Leazr',
      company_description: defaultCompany?.description || '',
      company_address: defaultCompany?.address || '',
      company_phone: defaultCompany?.phone || support?.phone || '',
      company_email: defaultCompany?.email || support?.email || '',
      logo_url: branding?.logo_url || '',
      primary_color: branding?.primary_color || '#3b82f6',
      secondary_color: branding?.secondary_color || '#64748b',
      accent_color: branding?.accent_color || '#8b5cf6',
      website_url: defaultCompany?.website || ''
    };
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return null;
  }
};

/**
 * Update a platform setting (super admin only)
 */
export const updatePlatformSetting = async (
  key: string,
  value: Record<string, any>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('platform_settings')
      .update({
        setting_value: value,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', key);

    if (error) {
      console.error(`Error updating platform setting ${key}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Exception updating platform setting ${key}:`, error);
    return false;
  }
};

/**
 * Update platform settings (super admin only)
 */
export const updatePlatformSettings = async (settings: Partial<PlatformSettings>): Promise<boolean> => {
  try {
    // Update platform branding
    if (settings.company_name || settings.primary_color || settings.secondary_color || settings.accent_color || settings.logo_url) {
      const branding = await getPlatformSetting('platform_branding') || {};
      const updatedBranding = {
        ...branding,
        ...(settings.company_name && { platform_name: settings.company_name }),
        ...(settings.primary_color && { primary_color: settings.primary_color }),
        ...(settings.secondary_color && { secondary_color: settings.secondary_color }),
        ...(settings.accent_color && { accent_color: settings.accent_color }),
        ...(settings.logo_url && { logo_url: settings.logo_url })
      };
      
      await updatePlatformSetting('platform_branding', updatedBranding);
    }

    // Update default company info
    if (settings.company_description || settings.company_address || settings.company_phone || settings.company_email || settings.website_url) {
      const defaultCompany = await getPlatformSetting('default_company_info') || {};
      const updatedCompany = {
        ...defaultCompany,
        ...(settings.company_description && { description: settings.company_description }),
        ...(settings.company_address && { address: settings.company_address }),
        ...(settings.company_phone && { phone: settings.company_phone }),
        ...(settings.company_email && { email: settings.company_email }),
        ...(settings.website_url && { website: settings.website_url })
      };
      
      await updatePlatformSetting('default_company_info', updatedCompany);
    }

    return true;
  } catch (error) {
    console.error('Error updating platform settings:', error);
    return false;
  }
};

/**
 * Get default company information
 */
export const getDefaultCompanyInfo = async (): Promise<CompanyDefaults | null> => {
  const data = await getPlatformSetting('default_company_info');
  return data as CompanyDefaults;
};

/**
 * Get support contact information
 */
export const getSupportContact = async (): Promise<SupportContact | null> => {
  const data = await getPlatformSetting('support_contact');
  return data as SupportContact;
};

/**
 * Get platform branding information
 */
export const getPlatformBranding = async (): Promise<PlatformBranding | null> => {
  const data = await getPlatformSetting('platform_branding');
  return data as PlatformBranding;
};