// Hook to initialize security features
import { useEffect } from 'react';
import { SecurityHeaders } from '@/utils/securityHeaders';
import { SecureStorage } from '@/utils/secureStorage';
import { SecurityMonitor } from '@/utils/securityMonitor';

export const useSecurityInit = () => {
  useEffect(() => {
    // Initialize security headers
    SecurityHeaders.initialize();
    
    // Clean up expired data on app start
    SecureStorage.cleanupExpiredData();
    
    // Set up periodic cleanup
    const cleanupInterval = setInterval(() => {
      SecureStorage.cleanupExpiredData();
      SecurityMonitor.cleanupRateLimit();
    }, 15 * 60 * 1000); // Every 15 minutes
    
    // Cleanup on unmount
    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);
};