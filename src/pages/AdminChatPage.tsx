import React from 'react'
import { EnhancedAdminDashboard } from '@/components/chat/EnhancedAdminDashboard'
import { AgentStatusToggle } from '@/components/chat/AgentStatusToggle'
import { ChatAvailabilityManager } from '@/components/chat/ChatAvailabilityManager'

const AdminChatPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chat en direct</h1>
        <p className="text-muted-foreground">Gérez les conversations avec les visiteurs du catalogue</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          {/* Agent Status */}
          <AgentStatusToggle />
          
          {/* Availability Hours */}
          <ChatAvailabilityManager />
        </div>

        <div className="lg:col-span-2">
          {/* Chat Dashboard */}
          <EnhancedAdminDashboard />
        </div>
      </div>
    </div>
  )
}

export default AdminChatPage