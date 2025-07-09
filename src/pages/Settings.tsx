
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, RefreshCw, User, Settings as SettingsIcon, Mail, FileText, Building2, BadgePercent, FileSignature, Upload, Users, Shield, Zap, MessageCircle } from 'lucide-react';
import GeneralSettings from '@/components/settings/GeneralSettings';
import EmailSettings from '@/components/settings/EmailSettings';
import PDFTemplateManager from '@/components/settings/PDFTemplateManager';
import LeaserManager from '@/components/settings/LeaserManager';
import CommissionManager from '@/components/settings/CommissionManager';
import ContractSettings from '@/components/settings/ContractSettings';
import DataImporter from '@/components/settings/DataImporter';
import MultiTenantUserManager from '@/components/settings/MultiTenantUserManager';
import PermissionProfilesManager from '@/components/settings/PermissionProfilesManager';
import IntegrationsManager from '@/components/settings/IntegrationsManager';
import ChatSettings from '@/components/settings/ChatSettings';
import TrialAwareSubscriptionCard from '@/components/settings/TrialAwareSubscriptionCard';
import { DataIsolationDiagnostic } from '@/components/admin/DataIsolationDiagnostic';

const Settings: React.FC = () => {
  const { user, subscription, checkSubscription, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vous devez être connecté');
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
      toast.error('Erreur lors de l\'ouverture du portail client');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setLoading(true);
    await checkSubscription();
    setLoading(false);
    toast.success('Statut d\'abonnement mis à jour');
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
        <TabsList className="grid w-full grid-cols-12">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Général
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Emails
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates PDF
          </TabsTrigger>
          <TabsTrigger value="leasers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Leasers
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <BadgePercent className="h-4 w-4" />
            Commissions
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Contrats
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Intégrations
          </TabsTrigger>
          <TabsTrigger value="diagnostic" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Diagnostic
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Abonnement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="emails" className="mt-6">
          <EmailSettings />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <PDFTemplateManager />
        </TabsContent>

        <TabsContent value="leasers" className="mt-6">
          <LeaserManager />
        </TabsContent>

        <TabsContent value="commissions" className="mt-6">
          <CommissionManager />
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <ContractSettings />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <DataImporter />
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

        <TabsContent value="chat" className="mt-6">
          <ChatSettings />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsManager />
        </TabsContent>

        <TabsContent value="diagnostic" className="mt-6">
          <DataIsolationDiagnostic />
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <TrialAwareSubscriptionCard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
