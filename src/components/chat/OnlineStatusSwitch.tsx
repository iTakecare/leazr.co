import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useAgentStatus } from '@/hooks/useAgentStatus';
import { motion } from 'framer-motion';

export const OnlineStatusSwitch: React.FC = () => {
  const {
    agentStatus,
    isLoading,
    error,
    toggleOnlineStatus
  } = useAgentStatus();

  if (isLoading || error || !agentStatus) {
    return null;
  }

  const isOnline = agentStatus.is_online;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ 
            backgroundColor: isOnline ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            scale: isOnline ? 1 : 0.8
          }}
          className="w-3 h-3 rounded-full"
        />
        <span className="text-sm font-medium">
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>
      
      <Switch
        checked={isOnline}
        onCheckedChange={toggleOnlineStatus}
        disabled={isLoading}
      />
    </div>
  );
};