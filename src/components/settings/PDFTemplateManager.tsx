
import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    
    try {
      const supabase = getSupabaseClient();
      
      const { data: tableExists, error: tableError } = await supabase.rpc(
        'check_table_exists', 
        { table_name: 'pdf_templates' }
      );
      
      if (tableError) {
        console.error("Error checking table existence:", tableError);
        throw new Error("Erreur lors de la vérification de la table");
      }
      
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
        console.log("No template found, will create a default one");
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
      
      const { error } = await supabase
        .from('pdf_templates')
        .upsert({
          id: 'default',
          ...updatedTemplate,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error("Error saving template:", error);
        throw new Error("Erreur lors de la sauvegarde du modèle");
      }
      
      setTemplate(updatedTemplate);
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
    if (template) {
      try {
        // Récupérer toutes les entrées du formulaire
        const formInputs = document.querySelectorAll('input[name]');
        const companyInfo: Record<string, string> = {};
        
        formInputs.forEach((field) => {
          // Cast en HTMLInputElement pour accéder aux propriétés name et value
          const inputField = field as HTMLInputElement;
          if (inputField.name && inputField.name !== '') {
            companyInfo[inputField.name] = inputField.value;
          }
        });
        
        console.log("Collected form data:", companyInfo);
        
        // Mise à jour du template avec les valeurs du formulaire
        const updatedTemplate = {
          ...template,
          ...companyInfo
        };
        
        console.log("Manual save triggered with template:", updatedTemplate);
        saveTemplate(updatedTemplate);
      } catch (error) {
        console.error("Error in manual save:", error);
        toast.error("Erreur lors de la sauvegarde manuelle");
      }
    } else {
      toast.error("Aucun modèle à sauvegarder");
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
