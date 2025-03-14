
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserRound, Building, Settings2, Mail } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import LeaserManager from "@/components/settings/LeaserManager";
import SmtpSettings from "@/components/settings/SmtpSettings";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("leasers");

  return (
    <PageTransition>
      <div className="container mx-auto p-6">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Paramètres</h1>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="leasers" className="flex items-center">
                <Building className="mr-2 h-4 w-4" />
                Bailleurs
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center">
                <UserRound className="mr-2 h-4 w-4" />
                Utilisateurs
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center">
                <Settings2 className="mr-2 h-4 w-4" />
                Général
              </TabsTrigger>
            </TabsList>

            <TabsContent value="leasers" className="space-y-4">
              <LeaserManager />
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <SmtpSettings />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="rounded-md border p-8 text-center">
                <h3 className="text-lg font-medium mb-2">Gestion des utilisateurs</h3>
                <p className="text-muted-foreground mb-4">
                  La gestion des utilisateurs sera disponible prochainement.
                </p>
                <Button variant="outline" disabled>
                  <UserRound className="mr-2 h-4 w-4" />
                  Gérer les utilisateurs
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="general" className="space-y-4">
              <div className="rounded-md border p-8 text-center">
                <h3 className="text-lg font-medium mb-2">Paramètres généraux</h3>
                <p className="text-muted-foreground mb-4">
                  Les paramètres généraux seront disponibles prochainement.
                </p>
                <Button variant="outline" disabled>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Configurer
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
};

export default Settings;
