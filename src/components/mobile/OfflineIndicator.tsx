import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";

// Simple network status hook that doesn't depend on external libraries
function useSimpleNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

const OfflineIndicator: React.FC = () => {
  const isOnline = useSimpleNetworkStatus();

  // Only show when offline - simplified version without IndexedDB
  if (isOnline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-14 left-0 right-0 z-40 px-4 py-2 safe-top bg-destructive/90 text-destructive-foreground"
      >
        <div className="flex items-center justify-center gap-2 max-w-lg mx-auto">
          <WifiOff className="h-4 w-4" />
          <span className="text-xs font-medium">
            Mode hors ligne - Les données seront synchronisées à la reconnexion
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineIndicator;
