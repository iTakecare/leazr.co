
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ensureBucket } from "@/services/fileStorage";
import { loadTemplate, saveTemplate, PDFTemplate } from "@/utils/templateManager";
import PDFCompanyInfo from "./PDFCompanyInfo";
import NewPDFTemplateEditor from "./NewPDFTemplateEditor";
import PDFPreview from "./PDFPreview";

const NewPDFTemplateManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [error, setError] = useState<string | null>(null);
  
  // Initialize on component mount
  useEffect(() => {
    console.log("Initialisation du gestionnaire de templates");
    initializeManager();
  }, []);
  
  // Initialize manager
  const initializeManager = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure storage bucket exists
      try {
        await ensureBucket('pdf-templates');
      } catch (e) {
        console.warn("Problème avec le bucket de stockage:", e);
        toast.warning("Stockage en mode local uniquement");
      }
      
      // Load template
      const templateData = await loadTemplate();
      
      if (templateData) {
        console.log("Template chargé avec succès");
        console.log("Nombre d'images:", templateData.templateImages.length);
        console.log("Nombre de champs:", templateData.fields.length);
        setTemplate(templateData);
        toast.success("Modèle chargé avec succès");
      } else {
        console.error("Impossible de charger le template");
        toast.error("Erreur lors du chargement du modèle");
      }
    } catch (err) {
      console.error("Erreur d'initialisation:", err);
      setError("Erreur lors de l'initialisation");
    } finally {
      setLoading(false);
    }
  };
  
  // Save template
  const handleSaveTemplate = async (updatedTemplate: PDFTemplate) => {
    try {
      setSaving(true);
      setError(null);
      
      // Log for debugging
      console.log("Sauvegarde du template:", updatedTemplate.name);
      console.log("Nombre d'images:", updatedTemplate.templateImages.length);
      console.log("Nombre de champs:", updatedTemplate.fields.length);
      
      const success = await saveTemplate(updatedTemplate);
      
      if (success) {
        setTemplate(updatedTemplate);
        toast.success("Modèle sauvegardé avec succès");
      } else {
        setError("Erreur lors de la sauvegarde");
        toast.error("Erreur lors de la sauvegarde du modèle");
      }
    } catch (err) {
      console.error("Exception lors de la sauvegarde:", err);
      setError("Erreur lors de la sauvegarde");
      toast.error("Erreur lors de la sauvegarde du modèle");
    } finally {
      setSaving(false);
    }
  };
  
  // Update company info
  const handleCompanyInfoUpdate = (companyInfo: Partial<PDFTemplate>) => {
    if (template) {
      const updatedTemplate = {
        ...template,
        ...companyInfo
      };
      
      handleSaveTemplate(updatedTemplate);
    }
  };
  
  // Update template
  const handleTemplateUpdate = (updatedTemplate: PDFTemplate) => {
    handleSaveTemplate(updatedTemplate);
  };
  
  // Retry loading
  const handleRetry = () => {
    initializeManager();
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
                <NewPDFTemplateEditor
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

export default NewPDFTemplateManager;
