// Hook to handle storage fallbacks and detect storage issues
import { useState, useEffect } from 'react';

interface StorageInfo {
  isAvailable: boolean;
  fallbackActive: boolean;
  errorMessage?: string;
}

export const useStorageFallback = () => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    isAvailable: true,
    fallbackActive: false
  });

  useEffect(() => {
    const checkStorage = () => {
      try {
        if (typeof Storage === 'undefined' || !window.localStorage) {
          setStorageInfo({
            isAvailable: false,
            fallbackActive: true,
            errorMessage: 'Storage not supported'
          });
          return;
        }

        const test = '__storage_test__';
        localStorage.setItem(test, 'test');
        localStorage.removeItem(test);
        
        setStorageInfo({
          isAvailable: true,
          fallbackActive: false
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Storage access denied';
        
        setStorageInfo({
          isAvailable: false,
          fallbackActive: true,
          errorMessage
        });

        // Show user-friendly message for storage issues
        if (errorMessage.includes('Access to storage is not allowed')) {
          console.warn('🚨 Storage blocked: Using memory fallback. Some features may be limited.');
        }
      }
    };

    checkStorage();
    
    // Check periodically in case storage becomes available
    const interval = setInterval(checkStorage, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return storageInfo;
};