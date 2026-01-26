import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  Zap, 
  Mail, 
  Building2, 
  BadgePercent, 
  GitBranch,
  FileText,
  Users,
  CreditCard,
  ChevronRight,
  Upload,
  FolderOpen,
  MessageCircle,
  User,
  LogOut
} from "lucide-react";
import MobileLayout from "../MobileLayout";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

// Import settings components
import GeneralSettings from "@/components/settings/GeneralSettings";
import EmailSettings from "@/components/settings/EmailSettings";
import LeaserManager from "@/components/settings/LeaserManager";
import CommissionManager from "@/components/settings/CommissionManager";
import MultiTenantUserManager from "@/components/settings/MultiTenantUserManager";
import IntegrationsManager from "@/components/settings/IntegrationsManager";
import TrialAwareSubscriptionCard from "@/components/settings/TrialAwareSubscriptionCard";
import WorkflowManagement from "@/components/workflows/WorkflowManagement";

interface SettingsSection {
  id: string;
  icon: React.ElementType;
  label: string;
  description?: string;
  component?: React.ReactNode;
  hiddenForBroker?: boolean;
}

const MobileSettingsPage: React.FC = () => {
  const { logout, isBroker } = useAuth();
  const isUserBroker = isBroker && typeof isBroker === 'function' ? isBroker() : false;
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections: SettingsSection[] = [
    {
      id: 'general',
      icon: Settings,
      label: 'Général',
      description: 'Informations de l\'entreprise',
      component: <GeneralSettings />,
    },
    {
      id: 'integrations',
      icon: Zap,
      label: 'Intégrations',
      description: 'Connexions externes',
      component: <IntegrationsManager />,
    },
    {
      id: 'emails',
      icon: Mail,
      label: 'Emails',
      description: 'Modèles et configuration',
      component: <EmailSettings />,
    },
    {
      id: 'leasers',
      icon: Building2,
      label: 'Leasers',
      description: 'Partenaires financiers',
      component: <LeaserManager />,
    },
    {
      id: 'commissions',
      icon: BadgePercent,
      label: 'Commissions',
      description: 'Barèmes et niveaux',
      component: <CommissionManager />,
    },
    {
      id: 'workflows',
      icon: GitBranch,
      label: 'Workflows',
      description: 'Automatisations',
      component: <WorkflowManagement />,
    },
    {
      id: 'users',
      icon: Users,
      label: 'Utilisateurs',
      description: 'Équipe et permissions',
      component: <MultiTenantUserManager />,
    },
    {
      id: 'subscription',
      icon: CreditCard,
      label: 'Abonnement',
      description: 'Plan et facturation',
      component: <TrialAwareSubscriptionCard />,
    },
  ];

  // Filter sections for broker users
  const visibleSections = sections.filter(s => !s.hiddenForBroker || !isUserBroker);

  const activeComponent = sections.find(s => s.id === activeSection)?.component;
  const activeSectionData = sections.find(s => s.id === activeSection);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <MobileLayout
      title="Paramètres"
      showSearch={false}
      showScanner={false}
    >
      <div className="space-y-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Paramètres</h1>
        </div>

        {/* Settings sections list */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {visibleSections.map((section, index) => {
            const Icon = section.icon;
            const isLast = index === visibleSections.length - 1;
            
            return (
              <motion.button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 text-left",
                  "hover:bg-muted/50 active:bg-muted transition-colors",
                  !isLast && "border-b border-border"
                )}
                whileTap={{ scale: 0.98 }}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{section.label}</p>
                  {section.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {section.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>

        {/* Account section */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Compte
            </p>
          </div>
          
          <motion.button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 active:bg-muted transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-destructive">Déconnexion</p>
              <p className="text-xs text-muted-foreground">
                Se déconnecter de l'application
              </p>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Section detail sheet */}
      <Sheet open={!!activeSection} onOpenChange={(open) => !open && setActiveSection(null)}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-full p-0 overflow-hidden"
        >
          <div className="h-full flex flex-col">
            {/* Sheet header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-background sticky top-0 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection(null)}
                className="px-2"
              >
                ← Retour
              </Button>
              <h2 className="font-semibold">{activeSectionData?.label}</h2>
            </div>
            
            {/* Sheet content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeComponent}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
};

export default MobileSettingsPage;
