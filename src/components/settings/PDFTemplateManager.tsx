import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { 
  getPDFTemplates, 
  createPDFTemplate, 
  PDFTemplate 
} from "@/services/pdfTemplateService";
import PDFCompanyInfo from "./PDFCompanyInfo";
import PDFTemplateWithFields from "./PDFTemplateWithFields";

const PDFTemplateManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("design");
  const [pendingChanges, setPendingChanges] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      
      try {
        const supabase = getSupabaseClient();
        
        const { data: tableExists, error: tableError } = await supabase.from('pdf_templates')
          .select('id', { count: 'exact', head: true })
          .limit(1);
        
        const tableNotFound = tableError && tableError.message.includes('relation "pdf_templates" does not exist');
        
        if (tableError && !tableNotFound) {
          console.error("Error checking if table exists:", tableError);
          throw new Error("Erreur lors de la vérification de la table");
        }
        
        if (tableNotFound || !tableExists) {
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
        
        const templates = await getPDFTemplates();
        setTemplates(templates);
        
        if (templates.length > 0) {
          setSelectedTemplate(templates[0]);
        }
      } catch (error) {
        console.error("Error loading templates:", error);
        toast.error("Erreur lors du chargement des modèles");
      } finally {
        setLoading(false);
      }
    };
    
    loadTemplates();
  }, []);
  
  const saveTemplate = async (updatedTemplate) => {
    setSaving(true);
    
    try {
      const supabase = getSupabaseClient();
      
      const id = selectedTemplate?.id || `template_${Date.now()}`;
      
      const { error } = await supabase
        .from('pdf_templates')
        .upsert({
          id,
          ...updatedTemplate,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error("Error saving template:", error);
        throw new Error("Erreur lors de la sauvegarde du modèle");
      }
      
      const templates = await getPDFTemplates();
      setTemplates(templates);
      
      const updatedSelectedTemplate = templates.find(t => t.id === id) || null;
      setSelectedTemplate(updatedSelectedTemplate);
      
      setPendingChanges(false);
      toast.success("Modèle sauvegardé avec succès");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erreur lors de la sauvegarde du modèle");
    } finally {
      setSaving(false);
    }
  };
  
  const handleCompanyInfoUpdate = (companyInfo) => {
    if (selectedTemplate) {
      const updatedTemplate = {
        ...selectedTemplate,
        ...companyInfo
      };
      
      saveTemplate(updatedTemplate);
    } else {
      const newTemplate = {
        id: `template_${Date.now()}`,
        name: 'Nouveau modèle',
        templateImages: [],
        fields: [],
        ...companyInfo
      };
      
      saveTemplate(newTemplate);
    }
  };
  
  const handleTemplateUpdate = (updatedTemplate) => {
    setSelectedTemplate(updatedTemplate);
    setPendingChanges(true);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Veuillez entrer un nom pour le modèle");
      return;
    }

    try {
      setSaving(true);
      const templateId = `template_${Date.now()}`;
      const defaultTemplate = {
        id: templateId,
        name: newTemplateName,
        companyName: "Votre Entreprise",
        companyAddress: "123 Rue Example, 75000 Paris",
        companyContact: "contact@example.com",
        companySiret: "123 456 789 00001",
        primaryColor: "#2C3E50",
        secondaryColor: "#3498DB",
        headerText: "OFFRE {offer_id}",
        footerText: "Cette offre est valable 30 jours à compter de sa date d'émission.",
        templateImages: [],
        fields: []
      };

      const { error } = await getSupabaseClient()
        .from('pdf_templates')
        .insert([defaultTemplate]);

      if (error) throw error;

      const templates = await getPDFTemplates();
      setTemplates(templates);
      
      const newTemplate = templates.find(t => t.id === templateId) || null;
      setSelectedTemplate(newTemplate);
      
      setIsCreateDialogOpen(false);
      setNewTemplateName("");
      toast.success("Nouveau modèle créé avec succès");
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Erreur lors de la création du modèle");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!id) return;

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) {
      return;
    }

    try {
      setSaving(true);
      const { error } = await getSupabaseClient()
        .from('pdf_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const templates = await getPDFTemplates();
      setTemplates(templates);
      
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(templates.length > 0 ? templates[0] : null);
      }
      
      toast.success("Modèle supprimé avec succès");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression du modèle");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Card className="w-full mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestionnaire de modèles PDF</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau modèle
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                {selectedTemplate?.name || "Sélectionner un modèle"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {templates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  className="flex items-center justify-between group cursor-pointer"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <span>{template.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Chargement du modèle...
            </p>
          </div>
        ) : selectedTemplate ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="company">Informations de l'entreprise</TabsTrigger>
              <TabsTrigger value="design">Conception du modèle</TabsTrigger>
            </TabsList>
            
            <TabsContent value="company" className="mt-6">
              <PDFCompanyInfo 
                template={selectedTemplate} 
                onSave={handleCompanyInfoUpdate} 
                loading={saving}
              />
            </TabsContent>
            
            <TabsContent value="design" className="mt-6">
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={() => saveTemplate(selectedTemplate)} 
                  disabled={saving || !pendingChanges}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saving ? "Sauvegarde en cours..." : "Sauvegarder le modèle"}
                </Button>
              </div>
              <PDFTemplateWithFields 
                template={selectedTemplate}
                onSave={handleTemplateUpdate}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              Aucun modèle disponible. Créez votre premier modèle.
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer un modèle
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau modèle</DialogTitle>
            <DialogDescription>
              Entrez un nom pour votre nouveau modèle PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nom du modèle</Label>
              <Input
                id="template-name"
                placeholder="Modèle par défaut"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleCreateTemplate}
                disabled={saving || !newTemplateName.trim()}
              >
                {saving ? "Création en cours..." : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PDFTemplateManager;
