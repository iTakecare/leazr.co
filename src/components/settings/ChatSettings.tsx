import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from 'lucide-react';
import { AgentStatusToggle } from '@/components/chat/AgentStatusToggle';
import { ChatAvailabilityManager } from '@/components/chat/ChatAvailabilityManager';

const ChatSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Paramètres du Chat en Direct
          </CardTitle>
          <CardDescription>
            Configurez votre statut d'agent et les horaires de disponibilité du chat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Agent Status */}
            <AgentStatusToggle />
            
            {/* Availability Hours */}
            <ChatAvailabilityManager />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatSettings;