
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserRound, Building, Settings2, Mail, BadgePercent, FileText } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import LeaserManager from "@/components/settings/LeaserManager";
import SmtpSettings from "@/components/settings/SmtpSettings";
import CommissionManager from "@/components/settings/CommissionManager";
import PDFTemplateManager from "@/components/settings/PDFTemplateManager";
import { useIsMobile } from "@/hooks/use-mobile";
import Container from "@/components/layout/Container";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("leasers");
  const isMobile = useIsMobile();

  return (
    <PageTransition>
      <Container>
        <div className="flex flex-col p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Paramètres</h1>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`mb-6 ${isMobile ? 'grid grid-cols-3 gap-2' : ''}`}>
              <TabsTrigger value="leasers" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span>Bailleurs</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </TabsTrigger>
              <TabsTrigger value="commissions" className="flex items-center gap-2">
                <BadgePercent className="h-4 w-4" />
                <span>Commissions</span>
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Modèle PDF</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                <span>Utilisateurs</span>
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                <span>Général</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="leasers" className="space-y-4">
              <LeaserManager />
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <SmtpSettings />
            </TabsContent>

            <TabsContent value="commissions" className="space-y-4">
              <CommissionManager />
            </TabsContent>

            <TabsContent value="pdf" className="space-y-4">
              <PDFTemplateManager />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="rounded-md border p-4 md:p-8 text-center">
                <h3 className="text-lg font-medium mb-2">Gestion des utilisateurs</h3>
                <p className="text-muted-foreground mb-4">
                  La gestion des utilisateurs sera disponible prochainement.
                </p>
                <Button variant="outline" disabled className="w-full sm:w-auto">
                  <UserRound className="mr-2 h-4 w-4" />
                  <span>Gérer les utilisateurs</span>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="general" className="space-y-4">
              <div className="rounded-md border p-4 md:p-8 text-center">
                <h3 className="text-lg font-medium mb-2">Paramètres généraux</h3>
                <p className="text-muted-foreground mb-4">
                  Les paramètres généraux seront disponibles prochainement.
                </p>
                <Button variant="outline" disabled className="w-full sm:w-auto">
                  <Settings2 className="mr-2 h-4 w-4" />
                  <span>Configurer</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </PageTransition>
  );
};

export default Settings;
