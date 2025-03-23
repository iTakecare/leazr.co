
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { loadPDFTemplate, savePDFTemplate } from "@/utils/pdfTemplateUtils";
import PDFCompanyInfo from "./PDFCompanyInfo";
import PDFTemplateWithFields from "./PDFTemplateWithFields";

interface PDFTemplate {
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
  [key: string]: any;
}

const PDFTemplateManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  
  useEffect(() => {
    console.log("PDFTemplateManager monté, chargement du modèle");
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    console.log("Début du chargement du modèle");
    
    try {
      // Utiliser la nouvelle fonction utilitaire pour charger le modèle
      const data = await loadPDFTemplate();
      
      if (data) {
        console.log("Modèle chargé avec succès:", data);
        setTemplate(data);
        toast.success("Modèle chargé avec succès");
      } else {
        console.log("Aucun modèle trouvé, un modèle par défaut sera créé lors de la sauvegarde");
        
        // Créer un modèle par défaut
        const defaultTemplate: PDFTemplate = {
          id: 'default',
          name: 'Modèle par défaut',
          companyName: 'iTakeCare',
          companyAddress: 'Avenue du Général Michel 1E, 6000 Charleroi, Belgique',
          companyContact: 'Tel: +32 471 511 121 - Email: hello@itakecare.be',
          companySiret: 'TVA: BE 0795.642.894',
          logoURL: '',
          primaryColor: '#2C3E50',
          secondaryColor: '#3498DB',
          headerText: 'OFFRE N° {offer_id}',
          footerText: 'Cette offre est valable 30 jours à compter de sa date d\'émission.',
          templateImages: [],
          fields: []
        };
        
        setTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du modèle:", error);
      toast.error("Erreur lors du chargement du modèle");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveTemplate = async (updatedTemplate: PDFTemplate) => {
    setSaving(true);
    console.log("Sauvegarde du modèle:", updatedTemplate);
    
    try {
      // Utiliser la nouvelle fonction utilitaire pour sauvegarder le modèle
      await savePDFTemplate(updatedTemplate);
      
      setTemplate(updatedTemplate);
      toast.success("Modèle sauvegardé avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du modèle:", error);
      toast.error("Erreur lors de la sauvegarde du modèle");
    } finally {
      setSaving(false);
    }
  };
  
  const handleCompanyInfoUpdate = (companyInfo: Partial<PDFTemplate>) => {
    if (template) {
      const updatedTemplate = {
        ...template,
        ...companyInfo
      };
      
      handleSaveTemplate(updatedTemplate);
    } else {
      const newTemplate: PDFTemplate = {
        id: 'default',
        name: 'Modèle par défaut',
        templateImages: [],
        fields: [],
        ...companyInfo as PDFTemplate
      };
      
      handleSaveTemplate(newTemplate);
    }
  };
  
  const handleTemplateUpdate = (updatedTemplate: PDFTemplate) => {
    handleSaveTemplate(updatedTemplate);
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
              <PDFCompanyInfo 
                template={template} 
                onSave={handleCompanyInfoUpdate} 
                loading={saving}
              />
            </TabsContent>
            
            <TabsContent value="design" className="mt-6">
              <PDFTemplateWithFields 
                template={template}
                onSave={handleTemplateUpdate}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFTemplateManager;
