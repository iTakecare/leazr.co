import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";

const OfflineIndicator: React.FC = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { pendingCount, isSyncing, syncAll } = useOfflineSync();

  const showIndicator = !isOnline || pendingCount > 0;

  if (!showIndicator) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={cn(
          "fixed top-14 left-0 right-0 z-40 px-4 py-2 safe-top",
          !isOnline 
            ? "bg-destructive/90 text-destructive-foreground" 
            : "bg-primary/90 text-primary-foreground"
        )}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-xs font-medium">
                  Mode hors ligne
                  {pendingCount > 0 && ` • ${pendingCount} action(s) en attente`}
                </span>
              </>
            ) : (
              <>
                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                <span className="text-xs font-medium">
                  {isSyncing 
                    ? "Synchronisation en cours..." 
                    : `${pendingCount} action(s) en attente`}
                </span>
              </>
            )}
          </div>
          
          {isOnline && pendingCount > 0 && !isSyncing && (
            <button
              onClick={syncAll}
              className="text-xs font-semibold underline"
            >
              Synchroniser
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineIndicator;
