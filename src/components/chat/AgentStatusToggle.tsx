import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Users, Clock, Wifi, WifiOff } from 'lucide-react';
import { useAgentStatus } from '@/hooks/useAgentStatus';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentStatusToggleProps {
  className?: string;
}

export const AgentStatusToggle: React.FC<AgentStatusToggleProps> = ({ 
  className = '' 
}) => {
  const {
    agentStatus,
    companyAvailability,
    isLoading,
    error,
    toggleOnlineStatus,
    toggleAvailability
  } = useAgentStatus();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-destructive ${className}`}>
        <CardContent className="p-4">
          <div className="text-destructive text-sm">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!agentStatus) {
    return null;
  }

  const isOnline = agentStatus.is_online;
  const isAvailable = agentStatus.is_available;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" />
          Statut Chat Support
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Online/Offline Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ 
                backgroundColor: isOnline ? 'hsl(var(--success))' : 'hsl(var(--muted))',
                scale: isOnline ? 1 : 0.8
              }}
              className="w-3 h-3 rounded-full"
            />
            <span className="font-medium">
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
          
          <Switch
            checked={isOnline}
            onCheckedChange={toggleOnlineStatus}
            disabled={isLoading}
          />
        </div>

        {/* Availability Toggle (only when online) */}
        <AnimatePresence>
          {isOnline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Separator className="my-3" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {isAvailable ? 'Disponible pour chat' : 'Occupé'}
                  </span>
                </div>
                
                <Switch
                  checked={isAvailable}
                  onCheckedChange={toggleAvailability}
                  disabled={isLoading}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Separator />

        {/* Company Status Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Statut entreprise :</span>
            <Badge 
              variant={companyAvailability.is_available ? "default" : "secondary"}
              className="gap-1"
            >
              {companyAvailability.is_available ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Disponible
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Indisponible
                </>
              )}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Agents en ligne :</span>
            <span className="font-medium">{companyAvailability.agent_count}</span>
          </div>
        </div>

        {/* Status Explanation */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          {!isOnline && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Activez votre statut pour recevoir des conversations
            </div>
          )}
          {isOnline && !isAvailable && (
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              Vous êtes en ligne mais marqué comme occupé
            </div>
          )}
          {isOnline && isAvailable && (
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3 w-3" />
              Vous recevrez les nouvelles conversations
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};