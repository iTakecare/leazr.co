
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSupabaseClient } from "@/integrations/supabase/client";
import PDFCompanyInfo from "./PDFCompanyInfo";
import PDFTemplateWithFields from "./PDFTemplateWithFields";
import { Save } from "lucide-react";

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
  
  // Référence au composant PDFCompanyInfo pour accéder à ses méthodes
  const companyInfoRef = useRef<any>(null);

  useEffect(() => {
    console.log("PDFTemplateManager mounted, loading template");
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    console.log("Starting to load template");
    
    try {
      const supabase = getSupabaseClient();
      
      // Vérifier si la table pdf_templates existe
      const { data: tableExists, error: tableError } = await supabase.rpc(
        'check_table_exists', 
        { table_name: 'pdf_templates' }
      );
      
      if (tableError) {
        console.error("Error checking table existence:", tableError);
        throw new Error("Erreur lors de la vérification de la table");
      }
      
      // Si la table n'existe pas, la créer
      if (!tableExists) {
        console.log("Table doesn't exist, creating it");
        const { error: createError } = await supabase.rpc('execute_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.pdf_templates (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              "companyName" TEXT NOT NULL,
              "companyAddress" TEXT NOT NULL,
              "companyContact" TEXT NOT NULL,
              "companySiret" TEXT NOT NULL,
              "logoURL" TEXT,
              "primaryColor" TEXT NOT NULL,
              "secondaryColor" TEXT NOT NULL,
              "headerText" TEXT NOT NULL,
              "footerText" TEXT NOT NULL,
              "templateImages" JSONB,
              fields JSONB NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
          `
        });
        
        if (createError) {
          console.error("Error creating table:", createError);
          throw new Error("Erreur lors de la création de la table");
        }
      }
      
      // Récupérer le modèle depuis la base de données
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', 'default')
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching template:", error);
        throw new Error("Erreur lors de la récupération du modèle");
      }
      
      if (data) {
        console.log("Template loaded successfully:", data);
        setTemplate(data);
      } else {
        console.log("No template found, will create a default one when saving");
        setTemplate(null);
      }
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Erreur lors du chargement du modèle");
    } finally {
      setLoading(false);
    }
  };
  
  const saveTemplate = async (updatedTemplate: PDFTemplate) => {
    setSaving(true);
    console.log("Saving template:", updatedTemplate);
    
    try {
      const supabase = getSupabaseClient();
      
      const templateToSave = {
        id: 'default',
        ...updatedTemplate,
        updated_at: new Date().toISOString()
      };
      
      console.log("Final template to save:", templateToSave);
      
      const { error } = await supabase
        .from('pdf_templates')
        .upsert(templateToSave);
        
      if (error) {
        console.error("Error saving template:", error);
        throw new Error("Erreur lors de la sauvegarde du modèle");
      }
      
      setTemplate(templateToSave);
      toast.success("Modèle sauvegardé avec succès");
    } catch (error) {
      console.error("Error saving template:", error);
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
      
      saveTemplate(updatedTemplate);
    } else {
      const newTemplate: PDFTemplate = {
        id: 'default',
        name: 'Modèle par défaut',
        templateImages: [],
        fields: [],
        ...companyInfo as PDFTemplate
      };
      
      saveTemplate(newTemplate);
    }
  };
  
  const handleTemplateUpdate = (updatedTemplate: PDFTemplate) => {
    saveTemplate(updatedTemplate);
  };

  const handleManualSave = () => {
    console.log("Manual save button clicked", { activeTab, companyInfoRef });
    
    if (!template) {
      toast.error("Aucun modèle à sauvegarder");
      return;
    }
    
    try {
      if (activeTab === "company") {
        // Récupérer les données du formulaire des informations de l'entreprise
        console.log("Getting form values from react-hook-form");
        
        // Utilisation de react-hook-form pour récupérer les valeurs
        // Sans référence directe aux éléments du DOM
        const formValues = {};
        
        // Récupérer tous les inputs pour les valeurs
        document.querySelectorAll('input[name]').forEach((field) => {
          const inputField = field as HTMLInputElement;
          if (inputField.name && inputField.name !== '') {
            formValues[inputField.name] = inputField.value;
          }
        });
        
        console.log("Collected form data:", formValues);
        
        // Mise à jour du template avec les valeurs du formulaire
        const updatedTemplate = {
          ...template,
          ...formValues
        };
        
        console.log("Manual save triggered with template:", updatedTemplate);
        saveTemplate(updatedTemplate);
      } else if (activeTab === "design") {
        // Pour l'onglet design, on utilisera le handler dédié du composant
        // qui est déjà connecté au bouton de sauvegarde
        toast.info("Utilisez le bouton de sauvegarde dans l'onglet Conception du modèle");
      }
    } catch (error) {
      console.error("Error in manual save:", error);
      toast.error("Erreur lors de la sauvegarde manuelle");
    }
  };
  
  return (
    <Card className="w-full mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestionnaire de modèles PDF</CardTitle>
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleManualSave}
          disabled={saving || loading || !template}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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
                ref={companyInfoRef}
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
