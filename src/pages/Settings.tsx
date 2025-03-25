
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import LeaserManager from "@/components/settings/LeaserManager";
import CommissionManager from "@/components/settings/CommissionManager";
import SmtpSettings from "@/components/settings/SmtpSettings";
import WooCommerceImporter from "@/components/settings/WooCommerceImporter";
import PDFTemplateManager from "@/components/settings/PDFTemplateManager";
import PDFTemplateList from "@/components/settings/PDFTemplateList";
import DataImporter from "@/components/settings/DataImporter";
import { useSearchParams, useNavigate } from "react-router-dom";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("leasers");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Récupère l'onglet à partir des paramètres d'URL
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Met à jour l'URL quand l'onglet change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // Récupère le template ID s'il est spécifié dans l'URL
  const selectedTemplateId = searchParams.get("template") || "default";

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-gray-500">Gérez les paramètres de votre application</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="leasers">Sociétés de Leasing</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="pdf">Modèles PDF</TabsTrigger>
          <TabsTrigger value="email">Configuration Email</TabsTrigger>
          <TabsTrigger value="woocommerce">WooCommerce</TabsTrigger>
          <TabsTrigger value="import">Import Données</TabsTrigger>
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
          <div className="space-y-6">
            <PDFTemplateList 
              onSelectTemplate={(templateId) => {
                // Mettre à jour l'URL avec le template sélectionné
                setSearchParams({ tab: 'pdf', template: templateId });
              }}
            />
            
            {/* Afficher le PDFTemplateManager avec le template sélectionné */}
            <PDFTemplateManager templateId={selectedTemplateId} />
          </div>
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

        <TabsContent value="import">
          <DataImporter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
