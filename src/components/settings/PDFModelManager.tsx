
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { loadPDFModel, savePDFModel, DEFAULT_MODEL_TEMPLATE, getCurrentCompanyId } from "@/utils/pdfModelUtils";
import PDFModelCompanyInfo from "./PDFModelCompanyInfo";
import PDFTemplateWithFields from "./PDFTemplateWithFields";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { PDFModel } from "@/utils/pdfModelUtils";

const PDFModelManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState<PDFModel | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [error, setError] = useState<string | null>(null);
  
  // Chargement du modèle au montage du composant
  useEffect(() => {
    loadModelData();
  }, []);

  // Fonction pour charger le modèle
  const loadModelData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Chargement du modèle PDF...");
      
      // Charger le modèle pour l'entreprise actuelle
      const modelData = await loadPDFModel('default');
      
      if (modelData) {
        console.log("Modèle chargé avec succès:", modelData.companyName);
        setModel(modelData);
        toast.success("Modèle chargé avec succès");
      } else {
        throw new Error("Impossible de charger le modèle PDF");
      }
    } catch (err: any) {
      console.error("Erreur lors du chargement du modèle:", err);
      setError(err.message || "Erreur lors du chargement du modèle");
      toast.error("Erreur lors du chargement du modèle");
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour sauvegarder le modèle
  const handleSaveModel = async (updatedModel: PDFModel) => {
    if (!updatedModel) {
      console.error("DÉBOGAGE: Aucun modèle fourni pour la sauvegarde");
      toast.error("Aucun modèle à sauvegarder");
      return;
    }

    console.log("DÉBOGAGE: Début de la sauvegarde du modèle", {
      modelId: updatedModel.id,
      modelName: updatedModel.name,
      companyName: updatedModel.companyName,
      hasAllFields: !!(updatedModel.name && updatedModel.companyName && updatedModel.companyAddress)
    });

    setSaving(true);
    setError(null);
    
    try {
      // Validation détaillée avec logs de debugging
      console.log("DÉBOGAGE: Validation des champs obligatoires...");
      
      if (!updatedModel.name?.trim()) {
        console.error("DÉBOGAGE: Nom du modèle manquant:", updatedModel.name);
        throw new Error("Le nom du modèle est obligatoire");
      }
      
      if (!updatedModel.companyName?.trim()) {
        console.error("DÉBOGAGE: Nom de l'entreprise manquant:", updatedModel.companyName);
        throw new Error("Le nom de l'entreprise est obligatoire");
      }
      
      if (!updatedModel.companyAddress?.trim()) {
        console.error("DÉBOGAGE: Adresse de l'entreprise manquante:", updatedModel.companyAddress);
        throw new Error("L'adresse de l'entreprise est obligatoire");
      }
      
      if (!updatedModel.companyContact?.trim()) {
        console.error("DÉBOGAGE: Contact de l'entreprise manquant:", updatedModel.companyContact);
        throw new Error("Le contact de l'entreprise est obligatoire");
      }
      
      console.log("DÉBOGAGE: Validation réussie, appel à savePDFModel...");
      
      // Tentative de sauvegarde avec timeout
      const savePromise = savePDFModel(updatedModel);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: La sauvegarde a pris trop de temps")), 30000)
      );
      
      await Promise.race([savePromise, timeoutPromise]);
      
      console.log("DÉBOGAGE: Sauvegarde réussie !");
      setModel(updatedModel);
      toast.success("Modèle sauvegardé avec succès ! Vos modifications ont été appliquées.");
      
    } catch (err: any) {
      console.error("DÉBOGAGE: Erreur détaillée lors de la sauvegarde:", {
        error: err,
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        code: err?.code,
        details: err?.details
      });
      
      let errorMessage = "Erreur lors de la sauvegarde du modèle";
      
      if (err.message?.includes('permission denied') || err.message?.includes('insufficient_privilege')) {
        errorMessage = "Vous n'avez pas les permissions nécessaires pour sauvegarder ce modèle";
      } else if (err.message?.includes('invalid input') || err.message?.includes('validation')) {
        errorMessage = "Les données saisies ne sont pas valides. Vérifiez tous les champs obligatoires.";
      } else if (err.message?.includes('Timeout')) {
        errorMessage = "La sauvegarde a pris trop de temps. Veuillez réessayer.";
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = "Erreur de connexion. Vérifiez votre connexion internet.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };
  
  // Gestion de la mise à jour des informations de l'entreprise
  const handleCompanyInfoUpdate = (companyInfo: Partial<PDFModel>) => {
    if (model) {
      const updatedModel = {
        ...model,
        ...companyInfo
      };
      
      handleSaveModel(updatedModel);
    }
  };
  
  // Gestion de la mise à jour du modèle complet
  const handleModelUpdate = (updatedModel: PDFModel) => {
    handleSaveModel(updatedModel);
  };

  // Fonction pour réessayer le chargement en cas d'erreur
  const handleRetry = () => {
    loadModelData();
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestionnaire de modèles PDF</CardTitle>
        <Button 
          variant="default" 
          size="sm" 
          onClick={() => model && handleSaveModel(model)}
          disabled={saving || loading || !model}
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
              {model && (
                <PDFModelCompanyInfo 
                  model={model} 
                  onSave={handleCompanyInfoUpdate} 
                  loading={saving}
                />
              )}
            </TabsContent>
            
            <TabsContent value="design" className="mt-6">
              {model && (
                <PDFTemplateWithFields 
                  template={model}
                  onSave={handleModelUpdate}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFModelManager;
