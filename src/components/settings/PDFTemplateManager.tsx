
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/integrations/supabase/client";
import PDFCompanyInfo from './PDFCompanyInfo';
import PDFTemplateWithFields from './PDFTemplateWithFields';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

const PDFTemplateManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("list");
  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    
    try {
      const supabase = getSupabaseClient();
      
      // First, check if the pdf_templates table exists
      const { data: tableExists, error: tableCheckError } = await supabase.rpc('table_exists', {
        table_name: 'pdf_templates'
      });
      
      if (tableCheckError) {
        console.error("Error checking table existence:", tableCheckError);
        
        // Table likely doesn't exist, so create it
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
      } else if (!tableExists) {
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
      
      // Now fetch templates from the table
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .order('name');
        
      if (error) {
        console.error("Error fetching templates:", error);
        throw new Error("Erreur lors de la récupération des modèles");
      }
      
      setTemplates(data || []);
      
      const defaultTemplate = data?.find(t => t.id === 'default') || data?.[0];
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Erreur lors du chargement des modèles");
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (updatedTemplate) => {
    setSaving(true);
    
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('pdf_templates')
        .upsert({
          ...updatedTemplate,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error("Error saving template:", error);
        throw new Error("Erreur lors de la sauvegarde du modèle");
      }
      
      setSelectedTemplate(updatedTemplate);
      setTemplates(prev => {
        const index = prev.findIndex(t => t.id === updatedTemplate.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedTemplate;
          return updated;
        } else {
          return [...prev, updatedTemplate];
        }
      });
      
      toast.success("Modèle sauvegardé avec succès");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erreur lors de la sauvegarde du modèle");
    } finally {
      setSaving(false);
    }
  };

  const createNewTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error("Veuillez spécifier un nom pour le modèle");
      return;
    }
    
    const templateId = `template_${Date.now()}`;
    
    const baseTemplate = templates.find(t => t.id === 'default') || {
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
    
    const newTemplate = {
      id: templateId,
      name: newTemplateName,
      ...baseTemplate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    saveTemplate(newTemplate)
      .then(() => {
        setNewTemplateDialogOpen(false);
        setNewTemplateName('');
        setActiveTab('design');
        setIsEditing(true);
      });
  };

  const deleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', templateToDelete.id);
        
      if (error) {
        console.error("Error deleting template:", error);
        throw new Error("Erreur lors de la suppression du modèle");
      }
      
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      
      if (selectedTemplate?.id === templateToDelete.id) {
        const remainingTemplates = templates.filter(t => t.id !== templateToDelete.id);
        setSelectedTemplate(remainingTemplates[0] || null);
        
        if (remainingTemplates.length === 0) {
          setActiveTab('list');
          setIsEditing(false);
        }
      }
      
      toast.success("Modèle supprimé avec succès");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression du modèle");
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const duplicateTemplate = async (template) => {
    try {
      const templateCopy = {
        ...template,
        id: `template_${Date.now()}`,
        name: `${template.name} (copie)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await saveTemplate(templateCopy);
      
      toast.success("Modèle dupliqué avec succès");
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Erreur lors de la duplication du modèle");
    }
  };

  const handleCompanyInfoUpdate = (companyInfo) => {
    if (selectedTemplate) {
      const updatedTemplate = {
        ...selectedTemplate,
        ...companyInfo
      };
      
      saveTemplate(updatedTemplate);
    }
  };

  const handleTemplateUpdate = (updatedTemplate) => {
    saveTemplate(updatedTemplate);
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setActiveTab('design');
    setIsEditing(true);
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gestionnaire de modèles PDF</CardTitle>
          {activeTab === 'list' && (
            <Button onClick={() => setNewTemplateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau modèle
            </Button>
          )}
          {isEditing && (
            <Button variant="outline" onClick={() => {
              setActiveTab('list');
              setIsEditing(false);
            }}>
              Retour à la liste
            </Button>
          )}
        </div>
        {isEditing && selectedTemplate && (
          <CardDescription>
            Modification du modèle : {selectedTemplate.name}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Chargement des modèles...
            </p>
          </div>
        ) : (
          <>
            {!isEditing ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium mb-4">Modèles disponibles</h3>
                {templates.length === 0 ? (
                  <div className="text-center py-8 border rounded-md">
                    <p className="text-muted-foreground mb-4">
                      Aucun modèle PDF disponible. Créez votre premier modèle.
                    </p>
                    <Button onClick={() => setNewTemplateDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Créer un modèle
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(template => (
                      <Card key={template.id} className="overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Mis à jour le {new Date(template.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => selectTemplate(template)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateTemplate(template)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Dupliquer
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setTemplateToDelete(template);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Entreprise:</span>
                              <span className="font-medium">{template.companyName}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Couleur principale:</span>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded" 
                                  style={{ backgroundColor: template.primaryColor }}
                                ></div>
                                <span>{template.primaryColor}</span>
                              </div>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Pages:</span>
                              <span className="font-medium">
                                {template.templateImages?.length || 0}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Champs:</span>
                              <span className="font-medium">
                                {template.fields?.filter(f => f.isVisible).length || 0} actifs 
                                / {template.fields?.length || 0} total
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-full mt-4"
                            onClick={() => selectTemplate(template)}
                          >
                            Modifier ce modèle
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
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
                  <PDFTemplateWithFields 
                    template={selectedTemplate}
                    onSave={handleTemplateUpdate}
                  />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={newTemplateDialogOpen} onOpenChange={setNewTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau modèle</DialogTitle>
            <DialogDescription>
              Donnez un nom à votre nouveau modèle. Vous pourrez ensuite configurer tous ses aspects.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="template-name" className="text-sm font-medium">
                Nom du modèle
              </label>
              <Input
                id="template-name"
                placeholder="Ex: Modèle standard, Modèle partenaire..."
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTemplateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={createNewTemplate}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Le modèle "{templateToDelete?.name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={deleteTemplate}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PDFTemplateManager;
