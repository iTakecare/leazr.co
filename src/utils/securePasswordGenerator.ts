/**
 * Secure password generation utilities
 * Used for creating temporary passwords that are cryptographically secure
 */

/**
 * Generates a cryptographically secure random password
 * @param length Password length (minimum 12, default 16)
 * @returns Secure random password
 */
export const generateSecurePassword = (length: number = 16): string => {
  if (length < 12) {
    throw new Error('Password length must be at least 12 characters');
  }

  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  // Ensure at least one character from each category
  let password = '';
  password += getRandomChar(uppercase);
  password += getRandomChar(lowercase);
  password += getRandomChar(numbers);
  password += getRandomChar(symbols);
  
  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += getRandomChar(allChars);
  }
  
  // Shuffle the password to avoid predictable patterns
  return shuffleString(password);
};

/**
 * Gets a random character from a string using crypto.getRandomValues
 */
const getRandomChar = (str: string): string => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return str[array[0] % str.length];
};

/**
 * Shuffles a string using Fisher-Yates algorithm with crypto random
 */
const shuffleString = (str: string): string => {
  const array = str.split('');
  for (let i = array.length - 1; i > 0; i--) {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const j = randomArray[0] % (i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array.join('');
};

/**
 * Generates a secure temporary token for password resets, etc.
 * @param length Token length (default 32)
 * @returns Secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  for (let i = 0; i < length; i++) {
    token += getRandomChar(chars);
  }
  
  return token;
};