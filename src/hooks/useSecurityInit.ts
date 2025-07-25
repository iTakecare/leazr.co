// Hook to initialize security features
import { useEffect } from 'react';
import { SecurityHeaders } from '@/utils/securityHeaders';
import { SecureStorage } from '@/utils/secureStorage';
import { SecurityMonitor } from '@/utils/securityMonitor';

export const useSecurityInit = () => {
  useEffect(() => {
    // Security initialization with graceful degradation
    const initSecurity = () => {
      try {
        // Initialize security headers (non-blocking)
        try {
          SecurityHeaders.initialize();
        } catch (headerError) {
          console.warn('Security headers failed to initialize:', headerError);
        }
        
        // Clean up expired data with fallback handling
        try {
          SecureStorage.cleanupExpiredData();
        } catch (storageError) {
          console.warn('Storage cleanup failed, continuing without:', storageError);
        }
        
        // Set up periodic cleanup with error isolation
        const cleanupInterval = setInterval(() => {
          try {
            SecureStorage.cleanupExpiredData();
          } catch (error) {
            console.warn('Periodic storage cleanup failed:', error);
          }
          
          try {
            SecurityMonitor.cleanupRateLimit();
          } catch (error) {
            console.warn('Rate limit cleanup failed:', error);
          }
        }, 15 * 60 * 1000); // Every 15 minutes
        
        return () => {
          clearInterval(cleanupInterval);
        };
      } catch (error) {
        console.warn('Security initialization failed completely, app will continue:', error);
        return () => {}; // Return empty cleanup function
      }
    };

    return initSecurity();
  }, []);
};