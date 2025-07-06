import React from 'react';
import Layout from '@/components/layout/Layout';
import { AgentStatusToggle } from '@/components/chat/AgentStatusToggle';
import { ChatAvailabilityManager } from '@/components/chat/ChatAvailabilityManager';
import { EnhancedAdminDashboard } from '@/components/chat/EnhancedAdminDashboard';
import Container from '@/components/layout/Container';

const ChatManagement: React.FC = () => {
  return (
    <Layout>
      <Container className="py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Gestion du Chat</h1>
          <p className="text-muted-foreground">
            Gérez votre statut d'agent et configurez les horaires de disponibilité du chat.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Agent Status */}
            <AgentStatusToggle />
            
            {/* Availability Hours */}
            <ChatAvailabilityManager />
          </div>

          <div>
            {/* Chat Dashboard */}
            <EnhancedAdminDashboard />
          </div>
        </div>
      </Container>
    </Layout>
  );
};

export default ChatManagement;