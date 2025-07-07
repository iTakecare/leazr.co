
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
        <TabsList className="grid w-full grid-cols-11">
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

        <TabsContent value="subscription" className="mt-6">
          <div className="space-y-6">
            {/* Subscription Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Abonnement
                </CardTitle>
                <CardDescription>
                  Gérez votre abonnement et votre facturation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Plan actuel:</span>
                      {subscription?.subscribed ? (
                        <Badge className="bg-green-100 text-green-800">
                          {planNames[subscription.subscription_tier as keyof typeof planNames] || subscription.subscription_tier}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Aucun abonnement actif</Badge>
                      )}
                    </div>
                    {subscription?.subscription_end && (
                      <p className="text-sm text-gray-600 mt-1">
                        Expire le: {new Date(subscription.subscription_end).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshSubscription}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                      Actualiser
                    </Button>
                    {subscription?.subscribed && (
                      <Button
                        onClick={handleManageSubscription}
                        disabled={loading}
                      >
                        Gérer l'abonnement
                      </Button>
                    )}
                  </div>
                </div>

                {!subscription?.subscribed && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                      Aucun abonnement actif. Souscrivez à un plan pour accéder à toutes les fonctionnalités.
                    </p>
                    <Button
                      className="mt-2"
                      onClick={() => window.location.href = '/signup'}
                    >
                      Choisir un plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations du compte
                </CardTitle>
                <CardDescription>
                  Vos informations personnelles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-lg">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">ID utilisateur</label>
                  <p className="text-sm text-gray-500 font-mono">{user?.id}</p>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={logout}>
                    Se déconnecter
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
