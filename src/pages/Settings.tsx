import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  Users,
  Building2,
  FileText,
  Mail,
  GitBranch,
  Zap,
  CreditCard,
  User,
  Shield,
  BadgePercent,
  FolderOpen,
  Upload,
  MessageCircle,
  Package,
  RefreshCw,
} from 'lucide-react';
import GeneralSettings from '@/components/settings/GeneralSettings';
import EmailSettings from '@/components/settings/EmailSettings';
import LeaserManager from '@/components/settings/LeaserManager';
import CommissionManager from '@/components/settings/CommissionManager';
import MultiTenantUserManager from '@/components/settings/MultiTenantUserManager';
import PermissionProfilesManager from '@/components/settings/PermissionProfilesManager';
import IntegrationsManager from '@/components/settings/IntegrationsManager';
import ChatSettings from '@/components/settings/ChatSettings';
import TrialAwareSubscriptionCard from '@/components/settings/TrialAwareSubscriptionCard';
import SoftwareCatalogManager from '@/components/settings/SoftwareCatalogManager';
import MDMConfigSection from '@/components/settings/MDMConfigSection';
import WorkflowManagement from '@/components/workflows/WorkflowManagement';
import HistoricalContractsImport from '@/components/settings/HistoricalContractsImport';
import PDFContentEditor from '@/pages/AdminPages/PDFContentEditor';
import CompanyDocuments from '@/pages/CompanyDocuments';
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileSettingsPage } from "@/components/mobile/pages";

const NAV_ITEMS = [
  { id: "general",       label: "Général",        icon: SettingsIcon },
  { id: "team",          label: "Équipe",          icon: Users },
  { id: "finances",      label: "Finances",        icon: Building2 },
  { id: "documents",     label: "Documents",       icon: FileText },
  { id: "communication", label: "Communication",   icon: Mail },
  { id: "automation",    label: "Automatisation",  icon: GitBranch },
  { id: "integrations",  label: "Intégrations",    icon: Zap },
  { id: "subscription",  label: "Abonnement",      icon: CreditCard },
];

const Settings: React.FC = () => {
  const isMobile = useIsMobile();
  const { isBroker } = useAuth();
  const isUserBroker = isBroker && typeof isBroker === 'function' ? isBroker() : false;
  const [activeTab, setActiveTab] = useState("general");

  if (isMobile) {
    return <MobileSettingsPage />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Paramètres</h1>
      </div>

      <div className="flex gap-6">
        {/* Vertical nav */}
        <nav className="w-48 shrink-0">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Général */}
          {activeTab === "general" && <GeneralSettings />}

          {/* Équipe */}
          {activeTab === "team" && (
            <Tabs defaultValue="users">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Utilisateurs
                </TabsTrigger>
                <TabsTrigger value="profiles" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Profils de permissions
                </TabsTrigger>
              </TabsList>
              <TabsContent value="users"><MultiTenantUserManager /></TabsContent>
              <TabsContent value="profiles"><PermissionProfilesManager /></TabsContent>
            </Tabs>
          )}

          {/* Finances */}
          {activeTab === "finances" && (
            <Tabs defaultValue="leasers">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="leasers" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Leasers
                </TabsTrigger>
                <TabsTrigger value="commissions" className="flex items-center gap-2">
                  <BadgePercent className="h-4 w-4" /> Commissions
                </TabsTrigger>
              </TabsList>
              <TabsContent value="leasers"><LeaserManager /></TabsContent>
              <TabsContent value="commissions"><CommissionManager /></TabsContent>
            </Tabs>
          )}

          {/* Documents */}
          {activeTab === "documents" && (
            <Tabs defaultValue="templates">
              <TabsList className={`grid w-full ${isUserBroker ? 'grid-cols-2' : 'grid-cols-3'} mb-6`}>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Templates PDF
                </TabsTrigger>
                <TabsTrigger value="company-docs" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" /> Documents entreprise
                </TabsTrigger>
                {!isUserBroker && (
                  <TabsTrigger value="import" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Import historique
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="templates"><PDFContentEditor /></TabsContent>
              <TabsContent value="company-docs"><CompanyDocuments /></TabsContent>
              {!isUserBroker && (
                <TabsContent value="import"><HistoricalContractsImport /></TabsContent>
              )}
            </Tabs>
          )}

          {/* Communication */}
          {activeTab === "communication" && (
            <Tabs defaultValue="emails">
              <TabsList className={`grid w-full ${isUserBroker ? 'grid-cols-1' : 'grid-cols-2'} mb-6`}>
                <TabsTrigger value="emails" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Emails
                </TabsTrigger>
                {!isUserBroker && (
                  <TabsTrigger value="chat" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" /> Chat
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="emails"><EmailSettings /></TabsContent>
              {!isUserBroker && (
                <TabsContent value="chat"><ChatSettings /></TabsContent>
              )}
            </Tabs>
          )}

          {/* Automatisation */}
          {activeTab === "automation" && <WorkflowManagement />}

          {/* Intégrations */}
          {activeTab === "integrations" && (
            <Tabs defaultValue="integrations">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="integrations" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Intégrations
                </TabsTrigger>
                <TabsTrigger value="software" className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> Logiciels & MDM
                </TabsTrigger>
              </TabsList>
              <TabsContent value="integrations"><IntegrationsManager /></TabsContent>
              <TabsContent value="software">
                <div className="space-y-6">
                  <SoftwareCatalogManager />
                  <MDMConfigSection />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Abonnement */}
          {activeTab === "subscription" && <TrialAwareSubscriptionCard />}
        </div>
      </div>
    </div>
  );
};

export default Settings;
