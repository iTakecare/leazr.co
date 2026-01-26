import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { 
  getPendingActions, 
  removePendingAction, 
  updatePendingActionError,
  getPendingActionsCount,
  type PendingAction 
} from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  error: string | null;
}

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus();
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    error: null,
  });

  // Update pending count periodically
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingActionsCount();
    setStatus(prev => ({ ...prev, pendingCount: count }));
  }, []);

  // Sync a single action
  const syncAction = async (action: PendingAction): Promise<boolean> => {
    try {
      const { type, entity, entityId, data } = action;
      
      switch (type) {
        case 'create':
          if (entity === 'offer') {
            const { error } = await supabase.from('offers').insert(data);
            if (error) throw error;
          } else if (entity === 'client') {
            const { error } = await supabase.from('clients').insert(data);
            if (error) throw error;
          }
          break;
          
        case 'update':
          if (entity === 'offer') {
            const { error } = await supabase.from('offers').update(data).eq('id', entityId);
            if (error) throw error;
          } else if (entity === 'client') {
            const { error } = await supabase.from('clients').update(data).eq('id', entityId);
            if (error) throw error;
          }
          break;
          
        case 'delete':
          if (entity === 'offer') {
            const { error } = await supabase.from('offers').delete().eq('id', entityId);
            if (error) throw error;
          } else if (entity === 'client') {
            const { error } = await supabase.from('clients').delete().eq('id', entityId);
            if (error) throw error;
          }
          break;
      }
      
      return true;
    } catch (error) {
      console.error('Sync action failed:', error);
      if (action.id) {
        await updatePendingActionError(action.id, (error as Error).message);
      }
      return false;
    }
  };

  // Sync all pending actions
  const syncAll = useCallback(async () => {
    if (!isOnline || status.isSyncing) return;
    
    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const pendingActions = await getPendingActions();
      let successCount = 0;
      let failCount = 0;
      
      for (const action of pendingActions) {
        const success = await syncAction(action);
        if (success && action.id) {
          await removePendingAction(action.id);
          successCount++;
        } else {
          failCount++;
        }
      }
      
      await updatePendingCount();
      
      if (successCount > 0) {
        toast({
          title: "Synchronisation terminée",
          description: `${successCount} action(s) synchronisée(s)${failCount > 0 ? `, ${failCount} en échec` : ''}`,
        });
      }
      
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
        error: failCount > 0 ? `${failCount} action(s) en échec` : null,
      }));
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: (error as Error).message,
      }));
    }
  }, [isOnline, status.isSyncing, updatePendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && status.pendingCount > 0 && !status.isSyncing) {
      // Delay sync slightly to ensure connection is stable
      const timer = setTimeout(() => {
        syncAll();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, status.pendingCount, status.isSyncing, syncAll]);

  // Update pending count on mount and periodically
  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  return {
    ...status,
    isOnline,
    syncAll,
    updatePendingCount,
  };
}
