
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { loadPDFTemplate, savePDFTemplate, DEFAULT_MODEL } from "@/utils/pdfTemplateUtils";
import PDFCompanyInfo from "./PDFCompanyInfo";
import PDFTemplateWithFields from "./PDFTemplateWithFields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkStorageConnection, resetStorageConnection } from "@/services/fileStorage";
import PDFPreview from "./PDFPreview";

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

interface PDFTemplateManagerProps {
  templateId?: string;
}

const PDFTemplateManager: React.FC<PDFTemplateManagerProps> = ({ templateId = 'default' }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [error, setError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<'cloud' | 'local'>('local'); // Default to local mode
  const [reconnecting, setReconnecting] = useState(false);
  const [templateExists, setTemplateExists] = useState(false);
  const [templateName, setTemplateName] = useState<string | undefined>(undefined);
  
  // Initialisation au montage ou lorsque templateId change
  useEffect(() => {
    console.log(`Initialisation du gestionnaire pour le modèle: ${templateId}`);
    initializeStorage();
  }, [templateId]);

  // Fonction pour initialiser le stockage
  const initializeStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Vérifier la connexion au stockage
      try {
        const isConnected = await checkStorageConnection();
        if (isConnected) {
          console.log("Connexion au stockage Supabase établie");
          setStorageMode('cloud');
          toast.success("Connexion au stockage Supabase établie");
        } else {
          console.log("Stockage Supabase non disponible");
          setStorageMode('local');
          toast.info("Mode stockage local activé");
        }
      } catch (storageError) {
        console.error("Erreur avec le stockage:", storageError);
        setStorageMode('local');
        toast.info("Mode stockage local activé");
      }
      
      // Charger le modèle spécifié
      await loadTemplate(templateId);
    } catch (err) {
      console.error("Erreur lors de l'initialisation:", err);
      setError("Erreur lors de l'initialisation du gestionnaire");
      setLoading(false);
    }
  };

  // Fonction pour réessayer la connexion
  const handleRetryConnection = async () => {
    try {
      setReconnecting(true);
      setError(null);
      
      toast.info("Tentative de connexion au stockage Supabase...");
      
      // Réinitialiser et vérifier la connexion au stockage
      const isConnected = await resetStorageConnection();
      
      if (isConnected) {
        console.log("Connexion au stockage Supabase établie");
        setStorageMode('cloud');
        toast.success("Connexion au stockage Supabase établie");
      } else {
        console.log("Stockage Supabase non disponible");
        setStorageMode('local');
        toast.info("Mode stockage local activé");
      }
    } catch (err) {
      console.error("Erreur lors de la tentative de connexion:", err);
      setStorageMode('local');
      toast.error("Échec de la connexion au stockage Supabase");
    } finally {
      setReconnecting(false);
    }
  };

  // Fonction pour charger le modèle
  const loadTemplate = async (id: string = 'default') => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Chargement du modèle PDF: ${id}`);
      const data = await loadPDFTemplate(id);
      
      if (!data) {
        console.log("Aucun modèle trouvé, utilisation du modèle par défaut");
        console.log("Modèle par défaut:", DEFAULT_MODEL);
        setTemplate({
          ...DEFAULT_MODEL,
          templateImages: [],
          fields: []
        });
        setTemplateExists(false);
        setTemplateName("Modèle par défaut");
        toast.info("Modèle par défaut chargé");
      } else {
        console.log("Modèle chargé avec succès:", data);
        
        // S'assurer que les tableaux sont correctement initialisés
        const sanitizedTemplate = {
          ...data,
          templateImages: Array.isArray(data.templateImages) ? data.templateImages : [],
          fields: Array.isArray(data.fields) ? data.fields : []
        };
        
        console.log("Modèle sanitisé:", sanitizedTemplate);
        console.log("Nombre d'images:", sanitizedTemplate.templateImages ? sanitizedTemplate.templateImages.length : 0);
        console.log("Nombre de champs:", sanitizedTemplate.fields ? sanitizedTemplate.fields.length : 0);
        
        setTemplate(sanitizedTemplate);
        setTemplateExists(true);
        setTemplateName(sanitizedTemplate.name);
        toast.success(`Modèle "${sanitizedTemplate.name}" chargé avec succès`);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du modèle:", err);
      setError("Erreur lors du chargement du modèle");
      toast.error("Erreur lors du chargement du modèle");
      
      // En cas d'erreur, définir quand même un modèle par défaut
      setTemplate({
        ...DEFAULT_MODEL,
        templateImages: [],
        fields: []
      });
      setTemplateExists(false);
      setTemplateName("Modèle par défaut (fallback)");
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour sauvegarder le modèle
  const handleSaveTemplate = async (updatedTemplate: PDFTemplate) => {
    setSaving(true);
    setError(null);
    
    try {
      console.log(`Sauvegarde du modèle: ${updatedTemplate.id}`, updatedTemplate);
      
      // S'assurer que les tableaux sont initialisés
      const sanitizedTemplate: PDFTemplate = {
        ...updatedTemplate,
        templateImages: Array.isArray(updatedTemplate.templateImages) ? updatedTemplate.templateImages : [],
        fields: Array.isArray(updatedTemplate.fields) ? updatedTemplate.fields : [],
        updated_at: new Date().toISOString()
      };
      
      console.log("Modèle à sauvegarder (sanitisé):", sanitizedTemplate);
      console.log("Nombre d'images à sauvegarder:", sanitizedTemplate.templateImages.length);
      console.log("Nombre de champs à sauvegarder:", sanitizedTemplate.fields.length);
      
      await savePDFTemplate(sanitizedTemplate);
      
      setTemplate(sanitizedTemplate);
      setTemplateExists(true);
      setTemplateName(sanitizedTemplate.name);
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
    console.log("handleTemplateUpdate appelé avec:", updatedTemplate);
    console.log("Nombre d'images dans updatedTemplate:", updatedTemplate.templateImages?.length || 0);
    console.log("Nombre de champs dans updatedTemplate:", updatedTemplate.fields?.length || 0);
    
    // S'assurer que les tableaux sont initialisés
    const sanitizedTemplate: PDFTemplate = {
      ...updatedTemplate,
      templateImages: Array.isArray(updatedTemplate.templateImages) ? updatedTemplate.templateImages : [],
      fields: Array.isArray(updatedTemplate.fields) ? updatedTemplate.fields : []
    };
    
    handleSaveTemplate(sanitizedTemplate);
  };
  
  // Fonction pour réessayer en cas d'erreur
  const handleRetry = () => {
    loadTemplate(templateId);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>
            {loading 
              ? "Chargement du modèle..." 
              : `Modèle: ${templateName || 'Non défini'}`}
          </CardTitle>
          {storageMode === 'local' && (
            <p className="text-sm text-amber-500 mt-1">
              Mode stockage local - Les images ne seront pas sauvegardées en ligne
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRetryConnection}
            disabled={loading || reconnecting}
          >
            {reconnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reconnexion...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Vérifier le stockage
              </>
            )}
          </Button>
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
        </div>
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
        
        {storageMode === 'local' && (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Stockage local uniquement</AlertTitle>
            <AlertDescription>
              Le stockage en ligne n'est pas disponible. Les modèles seront sauvegardés localement et 
              les images ne seront pas persistantes. Vous pouvez cliquer sur "Vérifier le stockage" pour réessayer.
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="company">Informations de l'entreprise</TabsTrigger>
              <TabsTrigger value="design">Conception du modèle</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
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
            
            <TabsContent value="preview" className="mt-6">
              {template && (
                <PDFPreview 
                  template={template}
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
