// Secure storage utility to encrypt sensitive data in localStorage
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'secure-app-key-2024'; // In production, use env variable
const SENSITIVE_DATA_PREFIX = 'sec_';

export class SecureStorage {
  // Encrypt and store sensitive data
  static setSecure(key: string, data: any): void {
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
      localStorage.setItem(SENSITIVE_DATA_PREFIX + key, encrypted);
    } catch (error) {
      console.error('Failed to encrypt data');
    }
  }

  // Decrypt and retrieve sensitive data
  static getSecure(key: string): any {
    try {
      const encrypted = localStorage.getItem(SENSITIVE_DATA_PREFIX + key);
      if (!encrypted) return null;
      
      const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      console.error('Failed to decrypt data');
      return null;
    }
  }

  // Remove secure data
  static removeSecure(key: string): void {
    localStorage.removeItem(SENSITIVE_DATA_PREFIX + key);
  }

  // Clear all secure data
  static clearAllSecure(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(SENSITIVE_DATA_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
  }

  // Clean up expired tokens and old data
  static cleanupExpiredData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('auth_') || key.startsWith('session_') || key.startsWith('temp_')) {
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
      console.error('Failed to cleanup expired data');
    }
  }

  // Enhanced security clear - clears everything including session storage
  static securityClear(): void {
    this.clearAllSecure();
    // Clear session storage as well
    sessionStorage.clear();
    // Clear any auth-related items
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('auth') || key.includes('token') || key.includes('session')
    );
    authKeys.forEach(key => localStorage.removeItem(key));
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