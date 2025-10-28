import React, { useState } from 'react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  Building2, 
  Users, 
  Zap, 
  GitBranch, 
  FileText,
  CreditCard,
  BadgePercent
} from 'lucide-react';
import GeneralSettings from '@/components/settings/GeneralSettings';
import IntegrationsManager from '@/components/settings/IntegrationsManager';
import LeaserManager from '@/components/settings/LeaserManager';
import AmbassadorsList from '@/components/crm/AmbassadorsList';
import WorkflowManagement from '@/components/workflows/WorkflowManagement';
import PDFTemplatesPage from '@/pages/AdminPages/PDFTemplatesPage';
import { Card, CardContent } from '@/components/ui/card';

const BrokerSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Paramètres Broker</h1>
            <p className="text-muted-foreground mt-2">
              Gérez les paramètres de votre activité de courtage
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Général
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Intégrations
              </TabsTrigger>
              <TabsTrigger value="leasers" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Leasers
              </TabsTrigger>
              <TabsTrigger value="workflows" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Workflows
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="ambassadors" className="flex items-center gap-2">
                <BadgePercent className="h-4 w-4" />
                Ambassadeurs
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Utilisateurs
              </TabsTrigger>
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

            <TabsContent value="leasers" className="mt-6">
              <LeaserManager />
            </TabsContent>

            <TabsContent value="workflows" className="mt-6">
              <WorkflowManagement />
            </TabsContent>

            <TabsContent value="templates" className="mt-6">
              <PDFTemplatesPage />
            </TabsContent>

            <TabsContent value="ambassadors" className="mt-6">
              <AmbassadorsList />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    Gestion des utilisateurs en développement
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscription" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    Abonnement géré par le super-admin
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </PageTransition>
  );
};

export default BrokerSettings;
