
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { loadPDFTemplate, savePDFTemplate, DEFAULT_TEMPLATE } from "@/utils/pdfTemplateUtils";
import PDFCompanyInfo from "./PDFCompanyInfo";
import PDFTemplateWithFields from "./PDFTemplateWithFields";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ensureBucket } from "@/services/fileStorage";

// Interface pour le modèle PDF
export interface PDFTemplate {
  id: string;
  name: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  companySiret: string;
  logoURL: string;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  templateImages: any[];
  fields: any[];
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

const PDFTemplateManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [error, setError] = useState<string | null>(null);
  
  // Initialisation au montage
  useEffect(() => {
    console.log("Initialisation du gestionnaire de modèles PDF");
    const initialize = async () => {
      try {
        // S'assurer que le bucket de stockage existe
        try {
          const bucketReady = await ensureBucket('pdf-templates');
          if (!bucketReady) {
            console.error("Problème lors de la création/vérification du bucket pdf-templates");
            toast.warning("Attention: Stockage en mode local uniquement");
          }
        } catch (storageError) {
          console.error("Erreur avec le stockage:", storageError);
          toast.warning("Attention: Stockage en mode local uniquement");
        }
        
        // Charger le modèle
        await loadTemplate();
      } catch (err) {
        console.error("Erreur lors de l'initialisation:", err);
        setError("Erreur lors de l'initialisation");
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  // Fonction pour charger le modèle
  const loadTemplate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Chargement du modèle PDF...");
      const data = await loadPDFTemplate();
      
      if (!data) {
        console.log("Aucun modèle trouvé, utilisation du modèle par défaut");
        setTemplate(DEFAULT_TEMPLATE);
        toast.info("Modèle par défaut chargé");
      } else {
        console.log("Modèle chargé avec succès:", data);
        
        // S'assurer que les tableaux sont initialisés
        const sanitizedTemplate: PDFTemplate = {
          ...data,
          templateImages: Array.isArray(data.templateImages) ? data.templateImages : [],
          fields: Array.isArray(data.fields) ? data.fields : []
        };
        
        console.log("Modèle sanitisé:", sanitizedTemplate);
        console.log("Nombre d'images:", sanitizedTemplate.templateImages.length);
        console.log("Nombre de champs:", sanitizedTemplate.fields.length);
        
        setTemplate(sanitizedTemplate);
        toast.success("Modèle chargé avec succès");
      }
    } catch (err) {
      console.error("Erreur lors du chargement du modèle:", err);
      setError("Erreur lors du chargement du modèle");
      toast.error("Erreur lors du chargement du modèle");
      
      // En cas d'erreur, définir quand même un modèle par défaut
      setTemplate(DEFAULT_TEMPLATE);
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour sauvegarder le modèle
  const handleSaveTemplate = async (updatedTemplate: PDFTemplate) => {
    setSaving(true);
    setError(null);
    
    try {
      console.log("Sauvegarde du modèle:", updatedTemplate);
      
      // S'assurer que les tableaux sont initialisés
      const sanitizedTemplate: PDFTemplate = {
        ...updatedTemplate,
        templateImages: Array.isArray(updatedTemplate.templateImages) ? updatedTemplate.templateImages : [],
        fields: Array.isArray(updatedTemplate.fields) ? updatedTemplate.fields : []
      };
      
      console.log("Modèle à sauvegarder (sanitisé):", sanitizedTemplate);
      console.log("Nombre d'images à sauvegarder:", sanitizedTemplate.templateImages.length);
      console.log("Nombre de champs à sauvegarder:", sanitizedTemplate.fields.length);
      
      await savePDFTemplate(sanitizedTemplate);
      
      setTemplate(sanitizedTemplate);
      toast.success("Modèle sauvegardé avec succès");
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du modèle:", err);
      setError("Erreur lors de la sauvegarde du modèle");
      toast.error("Erreur lors de la sauvegarde du modèle");
    } finally {
      setSaving(false);
    }
  };
  
  // Gestion des informations de l'entreprise
  const handleCompanyInfoUpdate = (companyInfo: Partial<PDFTemplate>) => {
    if (template) {
      const updatedTemplate = {
        ...template,
        ...companyInfo
      };
      
      handleSaveTemplate(updatedTemplate);
    }
  };
  
  // Gestion du modèle complet
  const handleTemplateUpdate = (updatedTemplate: PDFTemplate) => {
    handleSaveTemplate(updatedTemplate);
  };
  
  // Fonction pour réessayer en cas d'erreur
  const handleRetry = () => {
    loadTemplate();
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestionnaire de modèles PDF</CardTitle>
        <Button 
          variant="default" 
          size="sm" 
          onClick={() => template && handleSaveTemplate(template)}
          disabled={saving || loading || !template}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="self-start" 
                onClick={handleRetry}
              >
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Chargement du modèle...
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="company">Informations de l'entreprise</TabsTrigger>
              <TabsTrigger value="design">Conception du modèle</TabsTrigger>
            </TabsList>
            
            <TabsContent value="company" className="mt-6">
              {template && (
                <PDFCompanyInfo 
                  template={template} 
                  onSave={handleCompanyInfoUpdate} 
                  loading={saving}
                />
              )}
            </TabsContent>
            
            <TabsContent value="design" className="mt-6">
              {template && (
                <PDFTemplateWithFields 
                  template={template}
                  onSave={handleTemplateUpdate}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFTemplateManager;
