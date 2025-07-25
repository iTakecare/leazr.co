// Secure storage utility to encrypt sensitive data in localStorage
import CryptoJS from 'crypto-js';

const PREFIX = 'sec_';
const TOKEN_PREFIX = 'token_';

// Generate encryption key from browser fingerprint and session data
const generateEncryptionKey = (): string => {
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    window.location.hostname
  ].join('|');
  
  return CryptoJS.SHA256(fingerprint + 'leazr-security-key-2024').toString();
};

export class SecureStorage {
  // Encrypt and store sensitive data with expiration and integrity check
  static setSecure(key: string, data: any, expirationMinutes: number = 60): void {
    try {
      const expirationTime = Date.now() + (expirationMinutes * 60 * 1000);
      const payload = {
        data,
        expires: expirationTime,
        integrity: CryptoJS.SHA256(JSON.stringify(data)).toString(),
        timestamp: Date.now()
      };
      
      const jsonString = JSON.stringify(payload);
      const encryptionKey = generateEncryptionKey();
      const encrypted = CryptoJS.AES.encrypt(jsonString, encryptionKey).toString();
      localStorage.setItem(`${PREFIX}${key}`, encrypted);
    } catch (error) {
      console.error('Error storing secure data:', error);
    }
  }

  // Retrieve and decrypt sensitive data with validation
  static getSecure(key: string): any {
    try {
      const encrypted = localStorage.getItem(`${PREFIX}${key}`);
      if (!encrypted) return null;
      
      const encryptionKey = generateEncryptionKey();
      const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey).toString(CryptoJS.enc.Utf8);
      const payload = JSON.parse(decrypted);
      
      // Check expiration
      if (payload.expires && Date.now() > payload.expires) {
        this.removeSecure(key);
        return null;
      }
      
      // Verify integrity
      const currentIntegrity = CryptoJS.SHA256(JSON.stringify(payload.data)).toString();
      if (payload.integrity !== currentIntegrity) {
        console.warn('Data integrity check failed for key:', key);
        this.removeSecure(key);
        return null;
      }
      
      return payload.data;
    } catch (error) {
      console.error('Error retrieving secure data:', error);
      this.removeSecure(key); // Remove corrupted data
      return null;
    }
  }

  // Remove specific secure item
  static removeSecure(key: string): void {
    localStorage.removeItem(`${PREFIX}${key}`);
  }

  // Clear all secure items
  static clearAllSecure(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Clean up expired data and tokens
  static cleanupExpiredData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(PREFIX)) {
          try {
            const data = this.getSecure(key.replace(PREFIX, ''));
            // If getSecure returns null due to expiration, it's already cleaned up
          } catch {
            // Remove corrupted secure data
            localStorage.removeItem(key);
          }
        } else if (key.startsWith('auth_') || key.startsWith('session_') || key.startsWith('temp_')) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const data = JSON.parse(item);
              if (data.expires && new Date(data.expires) < new Date()) {
                localStorage.removeItem(key);
              }
            } catch {
              // If we can't parse it, it might be old/corrupted data
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
    }
  }

  // Store authentication tokens securely
  static setAuthToken(token: string, expirationMinutes: number = 60): void {
    this.setSecure(`${TOKEN_PREFIX}auth`, token, expirationMinutes);
  }
  
  // Retrieve authentication token
  static getAuthToken(): string | null {
    return this.getSecure(`${TOKEN_PREFIX}auth`);
  }
  
  // Remove authentication token
  static removeAuthToken(): void {
    this.removeSecure(`${TOKEN_PREFIX}auth`);
  }
  
  // Rotate tokens (remove old, store new)
  static rotateAuthToken(newToken: string, expirationMinutes: number = 60): void {
    this.removeAuthToken();
    this.setAuthToken(newToken, expirationMinutes);
  }

  // Complete security cleanup with session storage protection
  static securityClear(): void {
    // Clear all secure localStorage items
    this.clearAllSecure();
    
    // Clear sessionStorage but preserve navigation state
    const preserveKeys = ['theme', 'language'];
    const preserved: { [key: string]: string } = {};
    
    preserveKeys.forEach(key => {
      const value = sessionStorage.getItem(key);
      if (value) preserved[key] = value;
    });
    
    sessionStorage.clear();
    
    // Restore preserved items
    Object.entries(preserved).forEach(([key, value]) => {
      sessionStorage.setItem(key, value);
    });
    
    // Clear specific auth-related items that might not have the prefix
    const authKeys = ['supabase.auth.token', 'sb-', 'auth_session', 'user_session'];
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      // Also check for keys that start with these patterns
      Object.keys(localStorage).forEach(storageKey => {
        if (storageKey.startsWith(key)) {
          localStorage.removeItem(storageKey);
        }
      });
    });
  }

  // Store non-sensitive data normally
  static set(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Get non-sensitive data
  static get(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // Remove non-sensitive data
  static remove(key: string): void {
    localStorage.removeItem(key);
  }
}