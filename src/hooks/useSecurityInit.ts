// Hook to initialize security features
import { useEffect } from 'react';
import { SecurityHeaders } from '@/utils/securityHeaders';
import { SecureStorage } from '@/utils/secureStorage';
import { SecurityMonitor } from '@/utils/securityMonitor';

export const useSecurityInit = () => {
  useEffect(() => {
    try {
      // Initialize security headers
      SecurityHeaders.initialize();
      
      // Clean up expired data on app start (with error handling)
      try {
        SecureStorage.cleanupExpiredData();
      } catch (error) {
        console.warn('Storage cleanup failed:', error);
      }
      
      // Set up periodic cleanup
      const cleanupInterval = setInterval(() => {
        try {
          SecureStorage.cleanupExpiredData();
          SecurityMonitor.cleanupRateLimit();
        } catch (error) {
          console.warn('Periodic cleanup failed:', error);
        }
      }, 15 * 60 * 1000); // Every 15 minutes
      
      // Cleanup on unmount
      return () => {
        clearInterval(cleanupInterval);
      };
    } catch (error) {
      console.warn('Security initialization failed:', error);
      // App should continue working even if security features fail
    }
  }, []);
};