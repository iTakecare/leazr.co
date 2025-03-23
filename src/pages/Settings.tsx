
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import LeaserManager from "@/components/settings/LeaserManager";
import CommissionManager from "@/components/settings/CommissionManager";
import SmtpSettings from "@/components/settings/SmtpSettings";
import WooCommerceImporter from "@/components/settings/WooCommerceImporter";
import NewPDFTemplateManager from "@/components/settings/NewPDFTemplateManager";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("leasers");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-gray-500">Gérez les paramètres de votre application</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="leasers">Sociétés de Leasing</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="pdf">Modèles PDF</TabsTrigger>
          <TabsTrigger value="email">Configuration Email</TabsTrigger>
          <TabsTrigger value="woocommerce">WooCommerce</TabsTrigger>
        </TabsList>

        <TabsContent value="leasers">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des sociétés de Leasing</CardTitle>
              <CardDescription>
                Ajoutez, modifiez et supprimez les sociétés de leasing disponibles dans l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaserManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des commissions</CardTitle>
              <CardDescription>
                Configurez les taux de commission pour les partenaires et ambassadeurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommissionManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdf">
          <NewPDFTemplateManager />
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Email</CardTitle>
              <CardDescription>
                Configurez les paramètres SMTP pour l'envoi d'emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmtpSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="woocommerce">
          <Card>
            <CardHeader>
              <CardTitle>Importation WooCommerce</CardTitle>
              <CardDescription>
                Importez vos produits depuis WooCommerce
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WooCommerceImporter />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
