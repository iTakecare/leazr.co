import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, RefreshCw, User, Settings as SettingsIcon, Mail, FileText, Building2, BadgePercent, Users, Zap, MessageCircle, Shield, MapPin, GitBranch, Upload, FolderOpen } from 'lucide-react';
import GeneralSettings from '@/components/settings/GeneralSettings';
import EmailSettings from '@/components/settings/EmailSettings';


import LeaserManager from '@/components/settings/LeaserManager';
import CommissionManager from '@/components/settings/CommissionManager';

import MultiTenantUserManager from '@/components/settings/MultiTenantUserManager';
import PermissionProfilesManager from '@/components/settings/PermissionProfilesManager';
import IntegrationsManager from '@/components/settings/IntegrationsManager';
import ChatSettings from '@/components/settings/ChatSettings';
import TrialAwareSubscriptionCard from '@/components/settings/TrialAwareSubscriptionCard';

import WorkflowManagement from '@/components/workflows/WorkflowManagement';
import BulkClientImport from '@/components/settings/BulkClientImport';
import PDFContentEditor from '@/pages/AdminPages/PDFContentEditor';
import CompanyDocuments from '@/pages/CompanyDocuments';

const Settings: React.FC = () => {
  const { user, subscription, checkSubscription, logout, isBroker } = useAuth();
  const isUserBroker = isBroker && typeof isBroker === 'function' ? isBroker() : false;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du portail client:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ouverture du portail client",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setLoading(true);
    await checkSubscription();
    setLoading(false);
    toast({
      title: "Succès",
      description: "Statut d'abonnement mis à jour",
    });
  };

  const planNames = {
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business'
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Paramètres</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isUserBroker ? 'grid-cols-10' : 'grid-cols-12'}`}>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Général
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Intégrations
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Emails
          </TabsTrigger>
          <TabsTrigger value="leasers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Leasers
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <BadgePercent className="h-4 w-4" />
            Commissions
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          {!isUserBroker && (
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
          )}
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Documents
          </TabsTrigger>
          {!isUserBroker && (
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
          )}
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Abonnement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsManager />
        </TabsContent>

        <TabsContent value="emails" className="mt-6">
          <EmailSettings />
        </TabsContent>


        <TabsContent value="leasers" className="mt-6">
          <LeaserManager />
        </TabsContent>

        <TabsContent value="commissions" className="mt-6">
          <CommissionManager />
        </TabsContent>



        <TabsContent value="workflows" className="mt-6">
          <WorkflowManagement />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <PDFContentEditor />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Tabs defaultValue="user-list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="user-list" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Utilisateurs
              </TabsTrigger>
              <TabsTrigger value="profiles" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Profils
              </TabsTrigger>
            </TabsList>

            <TabsContent value="user-list" className="mt-6">
              <MultiTenantUserManager />
            </TabsContent>

            <TabsContent value="profiles" className="mt-6">
              <PermissionProfilesManager />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {!isUserBroker && (
          <TabsContent value="import" className="mt-6">
            <BulkClientImport />
          </TabsContent>
        )}

        <TabsContent value="documents" className="mt-6">
          <CompanyDocuments />
        </TabsContent>

        {!isUserBroker && (
          <TabsContent value="chat" className="mt-6">
            <ChatSettings />
          </TabsContent>
        )}

        <TabsContent value="subscription" className="mt-6">
          <TrialAwareSubscriptionCard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
