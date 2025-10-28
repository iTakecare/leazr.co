
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
  Building2,
  MapPin,
  Layers
} from "lucide-react";
import SaaSPlansManager from "./SaaSPlansManager";
import PlatformIdentitySettings from "./PlatformIdentitySettings";
import { PostalCodeImport } from "@/components/admin/PostalCodeImport";
import SaaSModulesManager from "./SaaSModulesManager";
import BrokerManagement from "./BrokerManagement";
import { Building } from "lucide-react";

const SaaSSettingsManager = () => {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "Général", icon: Settings },
    { id: "identity", label: "Identité", icon: Building2 },
    { id: "modules", label: "Modules", icon: Layers },
    { id: "plans", label: "Plans & Tarifs", icon: Package },
    { id: "brokers", label: "Brokers", icon: Building },
    { id: "postal-codes", label: "Codes Postaux", icon: MapPin },
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
        <TabsList className="grid w-full grid-cols-6">
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
                    <h3 className="font-medium">Mode de routage</h3>
                    <p className="text-sm text-muted-foreground">Slug d'entreprise (ex: leazr.co/monentreprise)</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium">Domaine principal</h3>
                    <p className="text-sm text-muted-foreground">leazr.co</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="identity" className="space-y-6">
          <PlatformIdentitySettings />
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <SaaSModulesManager />
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <SaaSPlansManager />
        </TabsContent>

        <TabsContent value="brokers" className="space-y-6">
          <BrokerManagement />
        </TabsContent>

        <TabsContent value="postal-codes" className="space-y-6">
          <PostalCodeImport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SaaSSettingsManager;
