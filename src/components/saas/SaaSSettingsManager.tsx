
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Users, 
  CreditCard, 
  Globe,
  Server,
  BarChart3,
  Package,
  Building2
} from "lucide-react";
import SaaSPlansManager from "./SaaSPlansManager";
import NetlifyDeploymentTab from "./NetlifyDeploymentTab";
import PlatformSettingsTab from "./PlatformSettingsTab";

const SaaSSettingsManager = () => {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "Général", icon: Settings },
    { id: "company", label: "Entreprise", icon: Building2 },
    { id: "netlify", label: "Netlify", icon: Globe },
    { id: "plans", label: "Plans & Tarifs", icon: Package },
    { id: "users", label: "Utilisateurs", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "billing", label: "Facturation", icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Configuration SaaS</h2>
          <p className="text-muted-foreground">Gérez les paramètres globaux de votre plateforme SaaS</p>
        </div>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          Admin SaaS
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres généraux</CardTitle>
              <CardDescription>
                Configuration générale de la plateforme SaaS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium">Domaine principal</h3>
                    <p className="text-sm text-muted-foreground">leazr.co</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium">Sous-domaines actifs</h3>
                    <p className="text-sm text-muted-foreground">En cours de calcul...</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <PlatformSettingsTab />
        </TabsContent>

        <TabsContent value="netlify" className="space-y-6">
          <NetlifyDeploymentTab />
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <SaaSPlansManager />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des utilisateurs</CardTitle>
              <CardDescription>
                Administrez les comptes utilisateurs de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Fonctionnalité en développement</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Statistiques et métriques de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Fonctionnalité en développement</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Facturation</CardTitle>
              <CardDescription>
                Gestion de la facturation et des abonnements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Fonctionnalité en développement</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SaaSSettingsManager;
