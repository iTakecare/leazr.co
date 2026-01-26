import React from "react";
import { motion } from "framer-motion";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";

interface SyncStatusProps {
  className?: string;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ className }) => {
  const { isOnline, isSyncing, pendingCount, lastSyncAt, error, syncAll } = useOfflineSync();

  const getStatusIcon = () => {
    if (isSyncing) {
      return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
    }
    if (error) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (pendingCount === 0) {
      return <Check className="h-4 w-4 text-primary" />;
    }
    return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (isSyncing) {
      return "Synchronisation...";
    }
    if (!isOnline) {
      return "Hors ligne";
    }
    if (error) {
      return "Erreur de sync";
    }
    if (pendingCount > 0) {
      return `${pendingCount} en attente`;
    }
    if (lastSyncAt) {
      const minutes = Math.floor((Date.now() - lastSyncAt.getTime()) / 60000);
      if (minutes < 1) return "Synchronisé";
      if (minutes < 60) return `Sync il y a ${minutes}min`;
      return "Synchronisé";
    }
    return "Synchronisé";
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={isOnline && pendingCount > 0 ? syncAll : undefined}
      disabled={!isOnline || pendingCount === 0 || isSyncing}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
        "bg-muted/50 hover:bg-muted",
        "disabled:opacity-50 disabled:cursor-default",
        className
      )}
    >
      {getStatusIcon()}
      <span className="text-xs font-medium text-muted-foreground">
        {getStatusText()}
      </span>
    </motion.button>
  );
};

export default SyncStatus;
