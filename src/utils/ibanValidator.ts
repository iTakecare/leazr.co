/**
 * IBAN Validator with MOD 97-10 checksum validation
 * ISO 7064 standard
 */

interface IBANValidationResult {
  isValid: boolean;
  country: string;
  countryName: string;
  formattedIBAN: string;
  error?: string;
}

// Country codes and their expected IBAN lengths
const IBAN_LENGTHS: Record<string, number> = {
  'AL': 28, 'AD': 24, 'AT': 20, 'AZ': 28, 'BH': 22, 'BY': 28,
  'BE': 16, 'BA': 20, 'BR': 29, 'BG': 22, 'CR': 22, 'HR': 21,
  'CY': 28, 'CZ': 24, 'DK': 18, 'DO': 28, 'EG': 29, 'EE': 20,
  'FO': 18, 'FI': 18, 'FR': 27, 'GE': 22, 'DE': 22, 'GI': 23,
  'GR': 27, 'GL': 18, 'GT': 28, 'HU': 28, 'IS': 26, 'IQ': 23,
  'IE': 22, 'IL': 23, 'IT': 27, 'JO': 30, 'KZ': 20, 'XK': 20,
  'KW': 30, 'LV': 21, 'LB': 28, 'LI': 21, 'LT': 20, 'LU': 20,
  'MK': 19, 'MT': 31, 'MR': 27, 'MU': 30, 'MD': 24, 'MC': 27,
  'ME': 22, 'NL': 18, 'NO': 15, 'PK': 24, 'PS': 29, 'PL': 28,
  'PT': 25, 'QA': 29, 'RO': 24, 'LC': 32, 'SM': 27, 'ST': 25,
  'SA': 24, 'RS': 22, 'SC': 31, 'SK': 24, 'SI': 19, 'ES': 24,
  'SE': 24, 'CH': 21, 'TL': 23, 'TN': 24, 'TR': 26, 'UA': 29,
  'AE': 23, 'GB': 22, 'VA': 22, 'VG': 24
};

const COUNTRY_NAMES: Record<string, string> = {
  'AL': 'Albanie', 'AD': 'Andorre', 'AT': 'Autriche', 'AZ': 'Azerbaïdjan',
  'BH': 'Bahreïn', 'BY': 'Biélorussie', 'BE': 'Belgique', 'BA': 'Bosnie-Herzégovine',
  'BR': 'Brésil', 'BG': 'Bulgarie', 'CR': 'Costa Rica', 'HR': 'Croatie',
  'CY': 'Chypre', 'CZ': 'République tchèque', 'DK': 'Danemark', 'DO': 'République dominicaine',
  'EG': 'Égypte', 'EE': 'Estonie', 'FO': 'Îles Féroé', 'FI': 'Finlande',
  'FR': 'France', 'GE': 'Géorgie', 'DE': 'Allemagne', 'GI': 'Gibraltar',
  'GR': 'Grèce', 'GL': 'Groenland', 'GT': 'Guatemala', 'HU': 'Hongrie',
  'IS': 'Islande', 'IQ': 'Irak', 'IE': 'Irlande', 'IL': 'Israël',
  'IT': 'Italie', 'JO': 'Jordanie', 'KZ': 'Kazakhstan', 'XK': 'Kosovo',
  'KW': 'Koweït', 'LV': 'Lettonie', 'LB': 'Liban', 'LI': 'Liechtenstein',
  'LT': 'Lituanie', 'LU': 'Luxembourg', 'MK': 'Macédoine du Nord', 'MT': 'Malte',
  'MR': 'Mauritanie', 'MU': 'Maurice', 'MD': 'Moldavie', 'MC': 'Monaco',
  'ME': 'Monténégro', 'NL': 'Pays-Bas', 'NO': 'Norvège', 'PK': 'Pakistan',
  'PS': 'Palestine', 'PL': 'Pologne', 'PT': 'Portugal', 'QA': 'Qatar',
  'RO': 'Roumanie', 'LC': 'Sainte-Lucie', 'SM': 'Saint-Marin', 'ST': 'São Tomé-et-Príncipe',
  'SA': 'Arabie saoudite', 'RS': 'Serbie', 'SC': 'Seychelles', 'SK': 'Slovaquie',
  'SI': 'Slovénie', 'ES': 'Espagne', 'SE': 'Suède', 'CH': 'Suisse',
  'TL': 'Timor oriental', 'TN': 'Tunisie', 'TR': 'Turquie', 'UA': 'Ukraine',
  'AE': 'Émirats arabes unis', 'GB': 'Royaume-Uni', 'VA': 'Vatican', 'VG': 'Îles Vierges britanniques'
};

/**
 * Validate IBAN using MOD 97-10 checksum (ISO 7064)
 */
export function validateIBAN(iban: string): IBANValidationResult {
  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  
  // Basic format validation
  if (!cleanIBAN || cleanIBAN.length < 5) {
    return {
      isValid: false,
      country: '',
      countryName: '',
      formattedIBAN: '',
      error: 'IBAN trop court'
    };
  }
  
  // Extract country code
  const countryCode = cleanIBAN.substring(0, 2);
  
  // Check if country is supported
  const expectedLength = IBAN_LENGTHS[countryCode];
  if (!expectedLength) {
    return {
      isValid: false,
      country: countryCode,
      countryName: 'Pays inconnu',
      formattedIBAN: formatIBAN(cleanIBAN),
      error: `Code pays non reconnu: ${countryCode}`
    };
  }
  
  // Check length
  if (cleanIBAN.length !== expectedLength) {
    return {
      isValid: false,
      country: countryCode,
      countryName: COUNTRY_NAMES[countryCode] || countryCode,
      formattedIBAN: formatIBAN(cleanIBAN),
      error: `Longueur invalide pour ${COUNTRY_NAMES[countryCode] || countryCode}: attendu ${expectedLength} caractères, reçu ${cleanIBAN.length}`
    };
  }
  
  // Check alphanumeric format
  if (!/^[A-Z0-9]+$/.test(cleanIBAN)) {
    return {
      isValid: false,
      country: countryCode,
      countryName: COUNTRY_NAMES[countryCode] || countryCode,
      formattedIBAN: formatIBAN(cleanIBAN),
      error: 'L\'IBAN ne doit contenir que des lettres et des chiffres'
    };
  }
  
  // Perform MOD 97-10 checksum validation
  const isValid = validateMod97(cleanIBAN);
  
  return {
    isValid,
    country: countryCode,
    countryName: COUNTRY_NAMES[countryCode] || countryCode,
    formattedIBAN: formatIBAN(cleanIBAN),
    error: isValid ? undefined : 'Checksum IBAN invalide'
  };
}

/**
 * MOD 97-10 checksum validation (ISO 7064)
 */
function validateMod97(iban: string): boolean {
  // Rearrange: move first 4 characters to end
  const rearranged = iban.substring(4) + iban.substring(0, 4);
  
  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const char of rearranged) {
    const charCode = char.charCodeAt(0);
    if (charCode >= 65 && charCode <= 90) {
      // Letter A-Z -> 10-35
      numericString += (charCode - 55).toString();
    } else {
      // Digit 0-9
      numericString += char;
    }
  }
  
  // Perform modulo 97 calculation on the numeric string
  // Use chunking to handle large numbers
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = remainder.toString() + numericString.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }
  
  // Valid IBAN has remainder of 1
  return remainder === 1;
}

/**
 * Format IBAN with spaces every 4 characters
 */
export function formatIBAN(iban: string): string {
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  return cleanIBAN.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Get country from IBAN
 */
export function getIBANCountry(iban: string): { code: string; name: string } | null {
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  if (cleanIBAN.length < 2) return null;
  
  const countryCode = cleanIBAN.substring(0, 2);
  const countryName = COUNTRY_NAMES[countryCode];
  
  if (!countryName) return null;
  
  return { code: countryCode, name: countryName };
}

/**
 * Check if IBAN format is potentially valid (quick check without full validation)
 */
export function isIBANFormatValid(iban: string): boolean {
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  if (cleanIBAN.length < 5) return false;
  
  const countryCode = cleanIBAN.substring(0, 2);
  const expectedLength = IBAN_LENGTHS[countryCode];
  
  if (!expectedLength) return false;
  if (cleanIBAN.length !== expectedLength) return false;
  if (!/^[A-Z0-9]+$/.test(cleanIBAN)) return false;
  
  return true;
}
