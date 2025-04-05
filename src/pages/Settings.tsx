
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import LeaserManager from "@/components/settings/LeaserManager";
import CommissionManager from "@/components/settings/CommissionManager";
import EmailSettings from "@/components/settings/EmailSettings";
import WooCommerceImporter from "@/components/settings/WooCommerceImporter";
import PDFTemplateManager from "@/components/settings/PDFTemplateManager";
import PDFTemplateList from "@/components/settings/PDFTemplateList";
import DataImporter from "@/components/settings/DataImporter";
import UserManager from "@/components/settings/UserManager";
import { useSearchParams, useNavigate } from "react-router-dom";
import GeneralSettings from "@/components/settings/GeneralSettings";
import { initStorage } from "@/services/bucketService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [searchParams, setSearchParams] = useSearchParams();
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    // Check storage on component mount
    const checkBuckets = async () => {
      try {
        await initStorage();
      } catch (error) {
        console.error("Error initializing storage:", error);
        setStorageError("Erreur lors de l'initialisation du stockage");
      }
    };
    
    checkBuckets();
  }, []);
  
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
      
      {storageError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Problème de stockage</AlertTitle>
          <AlertDescription>
            {storageError}
            <p className="mt-1">
              Vérifiez que les buckets de stockage nécessaires existent dans votre projet Supabase.
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="leasers">Sociétés de Leasing</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="pdf">Modèles PDF</TabsTrigger>
          <TabsTrigger value="email">Emails</TabsTrigger>
          <TabsTrigger value="woocommerce">WooCommerce</TabsTrigger>
          <TabsTrigger value="import">Import Données</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres généraux</CardTitle>
              <CardDescription>
                Configurez les paramètres globaux de l'application, comme le logo et les informations générales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettings />
            </CardContent>
          </Card>
        </TabsContent>

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
                Configurez les paramètres d'envoi d'emails et personnalisez les modèles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailSettings />
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
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des utilisateurs</CardTitle>
              <CardDescription>
                Ajoutez, modifiez et supprimez les utilisateurs administrateurs de l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
