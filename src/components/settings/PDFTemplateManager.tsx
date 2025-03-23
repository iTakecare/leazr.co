
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSupabaseClient } from "@/integrations/supabase/client";
import PDFCompanyInfo from "./PDFCompanyInfo";
import PDFTemplateWithFields from "./PDFTemplateWithFields";
import { Save, AlertCircle } from "lucide-react";

const PDFTemplateManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("design");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  // Charger le modèle existant s'il existe
  useEffect(() => {
    const loadTemplate = async () => {
      setLoading(true);
      
      try {
        const supabase = getSupabaseClient();
        
        // Vérifier si la table existe
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
          // Créer la table si elle n'existe pas
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
        
        // Récupérer le modèle par défaut
        const { data, error } = await supabase
          .from('pdf_templates')
          .select('*')
          .eq('id', 'default')
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
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
    
    loadTemplate();
  }, []);
  
  // Mise à jour du template dans PDFTemplateManager
  const handleTemplateUpdate = (updatedTemplate) => {
    // Stockage temporaire des changements
    setPendingChanges(updatedTemplate);
    setUnsavedChanges(true);
  };
  
  // Gestion des informations de l'entreprise
  const handleCompanyInfoUpdate = (companyInfo) => {
    let updatedTemplate;
    
    if (template) {
      updatedTemplate = {
        ...template,
        ...companyInfo
      };
    } else {
      updatedTemplate = {
        id: 'default',
        name: 'Modèle par défaut',
        templateImages: [],
        fields: [],
        ...companyInfo
      };
    }
    
    setPendingChanges(updatedTemplate);
    setUnsavedChanges(true);
  };
  
  // Sauvegarde globale
  const saveTemplate = async () => {
    if (!pendingChanges) {
      toast.info("Aucune modification à sauvegarder");
      return;
    }
    
    setSaving(true);
    
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('pdf_templates')
        .upsert({
          id: 'default',
          ...pendingChanges,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error("Error saving template:", error);
        throw new Error("Erreur lors de la sauvegarde du modèle");
      }
      
      setTemplate(pendingChanges);
      setPendingChanges(null);
      setUnsavedChanges(false);
      toast.success("Modèle sauvegardé avec succès");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erreur lors de la sauvegarde du modèle");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Card className="w-full mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestionnaire de modèles PDF</CardTitle>
        <Button 
          onClick={saveTemplate} 
          disabled={saving || !unsavedChanges}
          className="ml-auto bg-blue-600 hover:bg-blue-700 text-white"
          variant="default"
        >
          {saving ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </>
          )}
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
                template={pendingChanges || template} 
                onSave={handleCompanyInfoUpdate} 
                loading={saving}
              />
            </TabsContent>
            
            <TabsContent value="design" className="mt-6">
              <PDFTemplateWithFields 
                template={pendingChanges || template}
                onSave={handleTemplateUpdate}
              />
            </TabsContent>
          </Tabs>
        )}
        
        {unsavedChanges && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center justify-between">
            <p className="text-sm text-yellow-800 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Vous avez des modifications non sauvegardées.
            </p>
            <Button 
              onClick={saveTemplate} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              variant="default"
              size="sm"
            >
              {saving ? (
                <>
                  <div className="animate-spin mr-2 h-3 w-3 border-b-2 border-white rounded-full"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFTemplateManager;
