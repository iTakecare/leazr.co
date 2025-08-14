import { supabase } from '@/integrations/supabase/client';

export interface PlatformSettings {
  setting_key: string;
  setting_value: Record<string, any>;
  setting_type: 'system' | 'company_default';
  description?: string;
  is_public: boolean;
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