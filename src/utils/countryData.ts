
// Country data with flags (emoji representation) and dialing codes
export interface CountryData {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

export const countryData: Record<string, CountryData> = {
  BE: {
    code: 'BE',
    name: 'Belgique',
    flag: '🇧🇪',
    dialCode: '+32'
  },
  FR: {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    dialCode: '+33'
  },
  LU: {
    code: 'LU',
    name: 'Luxembourg',
    flag: '🇱🇺',
    dialCode: '+352'
  }
};

export const getCountryByCode = (code: string): CountryData => {
  return countryData[code] || countryData.BE; // Default to Belgium if code not found
};

export const formatPhoneWithDialCode = (phone: string, countryCode: string): string => {
  // If phone already has a plus sign, assume it already has a dial code
  if (phone.startsWith('+')) return phone;
  
  const country = getCountryByCode(countryCode);
  
  // If the phone is empty, just return the dial code
  if (!phone.trim()) return country.dialCode;
  
  // Remove any existing dial code if present to avoid duplicates
  let cleanPhone = phone.trim();
  
  // Strip any non-digit characters except for the plus sign at the beginning
  cleanPhone = cleanPhone.replace(/[^\d+]/g, '');
  
  // Remove the plus if it exists
  if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.substring(1);
  }
  
  // Check if phone already starts with the dial code (without the plus)
  const dialCodeWithoutPlus = country.dialCode.substring(1);
  if (cleanPhone.startsWith(dialCodeWithoutPlus)) {
    return `+${cleanPhone}`;
  }
  
  // Add the dial code
  return `${country.dialCode} ${cleanPhone}`;
};
