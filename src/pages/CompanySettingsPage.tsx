import React from "react";
import { Routes, Route } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompanyCustomizationManager from "@/components/settings/CompanyCustomizationManager";
import { 
  Settings as SettingsIcon, 
  Palette, 
  Users, 
  Mail, 
  Database,
  Shield,
  CreditCard,
  Building
} from "lucide-react";

const CompanySettingsPage = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Paramètres de l'entreprise</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres, la personnalisation et la configuration de votre entreprise.
        </p>
      </div>

      <Tabs defaultValue="customization" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="customization" className="gap-2">
            <Palette className="h-4 w-4" />
            Personnalisation
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Database className="h-4 w-4" />
            Intégrations
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Facturation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customization">
          <CompanyCustomizationManager />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestion des utilisateurs
              </CardTitle>
              <CardDescription>
                Gérez les utilisateurs et leurs permissions dans votre entreprise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Gestion des utilisateurs</h3>
                <p className="text-muted-foreground">
                  La gestion des utilisateurs sera disponible prochainement
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Intégrations
              </CardTitle>
              <CardDescription>
                Connectez votre système à des services externes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Intégrations</h3>
                <p className="text-muted-foreground">
                  Les intégrations tierces seront disponibles prochainement
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Facturation et abonnement
              </CardTitle>
              <CardDescription>
                Gérez votre abonnement et vos informations de facturation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Facturation</h3>
                <p className="text-muted-foreground">
                  La gestion de la facturation sera disponible prochainement
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanySettingsPage;