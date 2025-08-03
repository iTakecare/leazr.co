import { supabase } from "@/integrations/supabase/client";

export interface PostalCodeResult {
  postal_code: string;
  city: string;
  region?: string;
  country_code: string;
  country_name: string;
}

export interface CountryOption {
  code: string;
  name_fr: string;
  name_en: string;
  flag: string;
  dial_code: string;
}

/**
 * Search postal codes and cities
 */
export const searchPostalCodes = async (
  query: string,
  countryCode?: string,
  limit: number = 10
): Promise<PostalCodeResult[]> => {
  try {
    const { data, error } = await supabase.rpc('search_postal_codes', {
      search_query: query,
      country_filter: countryCode,
      result_limit: limit
    });

    if (error) {
      console.error('Error searching postal codes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchPostalCodes:', error);
    return [];
  }
};

/**
 * Search postal codes and cities without limit
 */
export const searchPostalCodesUnlimited = async (
  query: string,
  countryCode?: string
): Promise<PostalCodeResult[]> => {
  try {
    const { data, error } = await supabase.rpc('search_postal_codes', {
      search_query: query,
      country_filter: countryCode,
      result_limit: 1000 // Very high limit for unlimited search
    });

    if (error) {
      console.error('Error searching postal codes unlimited:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchPostalCodesUnlimited:', error);
    return [];
  }
};

/**
 * Get cities by postal code
 */
export const getCitiesByPostalCode = async (
  postalCode: string,
  countryCode?: string
): Promise<PostalCodeResult[]> => {
  try {
    const { data, error } = await supabase.rpc('get_cities_by_postal_code', {
      p_postal_code: postalCode,
      p_country_code: countryCode
    });

    if (error) {
      console.error('Error getting cities by postal code:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCitiesByPostalCode:', error);
    return [];
  }
};

/**
 * Get all available countries
 */
export const getCountries = async (): Promise<CountryOption[]> => {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('code, name_fr, name_en, flag, dial_code')
      .order('name_fr');

    if (error) {
      console.error('Error fetching countries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCountries:', error);
    return [];
  }
};

/**
 * Get default country for current company
 */
export const getDefaultCountryForCompany = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('get_default_country_for_company');

    if (error) {
      console.error('Error getting default country:', error);
      return 'BE'; // Default to Belgium
    }

    return data || 'BE';
  } catch (error) {
    console.error('Error in getDefaultCountryForCompany:', error);
    return 'BE';
  }
};

/**
 * Format phone number with country dial code
 */
export const formatPhoneWithCountry = (phone: string, countryCode: string): string => {
  if (!phone || phone.startsWith('+')) return phone;

  const dialCodes: Record<string, string> = {
    'BE': '+32',
    'FR': '+33',
    'LU': '+352',
    'DE': '+49',
    'NL': '+31',
    'IT': '+39',
    'ES': '+34',
    'PT': '+351',
    'AT': '+43',
    'CH': '+41',
  };

  const dialCode = dialCodes[countryCode] || '+32';
  
  // Remove any existing dial code
  let cleanPhone = phone.replace(/^\+?\d{1,4}\s?/, '');
  
  return `${dialCode} ${cleanPhone}`;
};