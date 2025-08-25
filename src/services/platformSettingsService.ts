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
 * Get platform settings directly from the database
 */
export const getPlatformSettings = async (): Promise<PlatformSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching platform settings:', error);
      // Return default settings if fetch fails
      return {
        company_name: 'Leazr',
        company_description: '',
        company_address: '',
        company_phone: '',
        company_email: '',
        logo_url: '/leazr-logo.png',
        primary_color: '#3b82f6',
        secondary_color: '#64748b',
        accent_color: '#8b5cf6',
        website_url: ''
      };
    }

    if (!data) {
      // Return default settings if no data found
      return {
        company_name: 'Leazr',
        company_description: '',
        company_address: '',
        company_phone: '',
        company_email: '',
        logo_url: '/leazr-logo.png',
        primary_color: '#3b82f6',
        secondary_color: '#64748b',
        accent_color: '#8b5cf6',
        website_url: ''
      };
    }

    return {
      company_name: data.company_name || 'Leazr',
      company_description: data.company_description || '',
      company_address: data.company_address || '',
      company_phone: data.company_phone || '',
      company_email: data.company_email || '',
      logo_url: data.logo_url || '/leazr-logo.png',
      primary_color: data.primary_color || '#3b82f6',
      secondary_color: data.secondary_color || '#64748b',
      accent_color: data.accent_color || '#8b5cf6',
      website_url: data.website_url || ''
    };
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    // Return default settings on exception
    return {
      company_name: 'Leazr',
      company_description: '',
      company_address: '',
      company_phone: '',
      company_email: '',
      logo_url: '/leazr-logo.png',
      primary_color: '#3b82f6',
      secondary_color: '#64748b',
      accent_color: '#8b5cf6',
      website_url: ''
    };
  }
};

/**
 * Update platform settings (super admin only)
 */
export const updatePlatformSettings = async (settings: Partial<PlatformSettings>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('platform_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating platform settings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating platform settings:', error);
    return false;
  }
};

/**
 * Get platform branding information directly
 */
export const getPlatformBranding = async (): Promise<PlatformBranding | null> => {
  const settings = await getPlatformSettings();
  if (!settings) return null;
  
  return {
    platform_name: settings.company_name,
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    accent_color: settings.accent_color
  };
};