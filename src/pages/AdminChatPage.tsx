import React from 'react'
import { EnhancedAdminDashboard } from '@/components/chat/EnhancedAdminDashboard'
import { ChatAvailabilityManager } from '@/components/chat/ChatAvailabilityManager'
import { ChatNotificationSettings } from '@/components/chat/ChatNotificationSettings'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageCircle, Settings, Users } from 'lucide-react'

const AdminChatPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto p-6">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Chat Support</h1>
              <p className="text-muted-foreground">
                Gérez les conversations et configurez votre disponibilité
              </p>
            </div>
          </div>
        </div>

        {/* Improved Layout with Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Card className="border-0 shadow-lg bg-background/95 backdrop-blur-sm">
              <CardContent className="p-6">
                <EnhancedAdminDashboard />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Availability Hours Card */}
              <Card className="border-0 shadow-lg bg-background/95 backdrop-blur-sm">
                <CardContent className="p-6">
                  <ChatAvailabilityManager />
                </CardContent>
              </Card>

              {/* Notification Settings Card */}
              <ChatNotificationSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AdminChatPage