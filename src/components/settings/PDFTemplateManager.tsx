
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSupabaseClient } from "@/integrations/supabase/client";
import PDFCompanyInfo from "./PDFCompanyInfo";
import PDFTemplateWithFields, { DEFAULT_FIELDS } from "./PDFTemplateWithFields";
import { Save, AlertCircle, Plus, Trash, FileCheck, Undo, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PDFTemplateManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [workingTemplate, setWorkingTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("company");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [error, setError] = useState(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Configurer la table et charger les modèles existants
  useEffect(() => {
    setupTable();
  }, []);
  
  const setupTable = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = getSupabaseClient();
      
      // Vérifier si la table existe
      const { data: tableExists, error: tableError } = await supabase.rpc(
        'check_table_exists', 
        { table_name: 'pdf_templates' }
      );
      
      if (tableError) {
        console.error("Error checking table existence:", tableError);
        setError(`Erreur lors de la vérification de la table: ${tableError.message}`);
        setLoading(false);
        return;
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
          setError(`Erreur lors de la création de la table: ${createError.message}`);
          setLoading(false);
          return;
        }
      }
      
      await loadTemplates();
    } catch (error) {
      console.error("Error setting up table:", error);
      setError(`Erreur: ${error.message}`);
      setLoading(false);
    }
  };
  
  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = getSupabaseClient();
      
      // Récupérer tous les modèles
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .order('name');
        
      if (error) {
        console.error("Error fetching templates:", error);
        setError(`Erreur lors de la récupération des modèles: ${error.message}`);
        setLoading(false);
        return;
      }
      
      setTemplates(data || []);
      
      // Si nous avons des modèles, sélectionner le premier par défaut
      if (data && data.length > 0) {
        const template = data[0];
        setCurrentTemplate(template);
        setWorkingTemplate(template);
        setUnsavedChanges(false);
      } else {
        // Aucun modèle trouvé, créer un modèle par défaut
        const defaultTemplate = {
          id: `template_${Date.now()}`,
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
          fields: DEFAULT_FIELDS
        };
        
        setCurrentTemplate(null);
        setWorkingTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Gérer les mises à jour de modèle
  const handleTemplateUpdate = (updatedTemplate) => {
    setWorkingTemplate(updatedTemplate);
    setUnsavedChanges(true);
  };
  
  // Gérer les mises à jour des informations de l'entreprise
  const handleCompanyInfoUpdate = (companyInfo) => {
    setWorkingTemplate(prevTemplate => ({
      ...prevTemplate,
      ...companyInfo
    }));
    setUnsavedChanges(true);
  };
  
  // Sauvegarder le modèle actuel
  const saveTemplate = async () => {
    if (!workingTemplate) {
      return;
    }
    
    setSaving(true);
    
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('pdf_templates')
        .upsert({
          ...workingTemplate,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error("Error saving template:", error);
        toast.error(`Erreur lors de la sauvegarde: ${error.message}`);
        setSaving(false);
        return;
      }
      
      setCurrentTemplate(workingTemplate);
      setUnsavedChanges(false);
      
      // Montrer un toast uniquement lors d'une sauvegarde explicite
      toast.success("Modèle sauvegardé avec succès");
      
      // Rafraîchir la liste des modèles
      await loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Annuler les modifications
  const discardChanges = () => {
    setWorkingTemplate(currentTemplate);
    setUnsavedChanges(false);
    toast.info("Modifications annulées");
  };

  // Changer de modèle
  const handleTemplateChange = (templateId) => {
    if (unsavedChanges) {
      if (confirm("Vous avez des modifications non sauvegardées. Voulez-vous continuer sans sauvegarder ?")) {
        const selected = templates.find(t => t.id === templateId);
        setCurrentTemplate(selected);
        setWorkingTemplate(selected);
        setUnsavedChanges(false);
      }
    } else {
      const selected = templates.find(t => t.id === templateId);
      setCurrentTemplate(selected);
      setWorkingTemplate(selected);
    }
  };

  // Créer un nouveau modèle
  const createNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Veuillez saisir un nom pour le nouveau modèle");
      return;
    }
    
    setSaving(true);
    
    try {
      // Créer un identifiant unique basé sur le nom
      const templateId = `template_${Date.now()}`;
      
      // Définir un modèle par défaut
      const newTemplate = {
        id: templateId,
        name: newTemplateName,
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
        fields: DEFAULT_FIELDS
      };
      
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('pdf_templates')
        .insert(newTemplate);
        
      if (error) {
        console.error("Error creating template:", error);
        toast.error(`Erreur lors de la création du modèle: ${error.message}`);
        setSaving(false);
        return;
      }
      
      toast.success("Nouveau modèle créé avec succès");
      
      // Fermer le dialogue et réinitialiser le formulaire
      setShowNewTemplateDialog(false);
      setNewTemplateName("");
      
      // Rafraîchir la liste et sélectionner le nouveau modèle
      await loadTemplates();
      
      // Sélectionner le nouveau modèle
      setCurrentTemplate(newTemplate);
      setWorkingTemplate(newTemplate);
      setUnsavedChanges(false);
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un modèle
  const deleteTemplate = async () => {
    if (!currentTemplate) return;
    
    setSaving(true);
    
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', currentTemplate.id);
        
      if (error) {
        console.error("Error deleting template:", error);
        toast.error(`Erreur lors de la suppression: ${error.message}`);
        setSaving(false);
        return;
      }
      
      toast.success("Modèle supprimé avec succès");
      
      // Rafraîchir la liste
      await loadTemplates();
      
      // Fermer le dialogue
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Card className="w-full mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestionnaire de modèles PDF</CardTitle>
        <div className="flex items-center space-x-2">
          <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouveau modèle</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="template-name">Nom du modèle</Label>
                <Input 
                  id="template-name" 
                  value={newTemplateName} 
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Mon nouveau modèle"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={createNewTemplate} disabled={saving || !newTemplateName.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4 mr-2" />
                      Créer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Chargement des modèles...
            </p>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
            <div className="flex justify-center mt-4 space-x-2">
              <Button onClick={() => setupTable()} variant="outline">
                Réessayer
              </Button>
            </div>
          </Alert>
        ) : (
          <>
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center flex-grow gap-2">
                  <Label htmlFor="template-selector" className="whitespace-nowrap">
                    Modèle actif:
                  </Label>
                  <Select 
                    value={currentTemplate?.id} 
                    onValueChange={handleTemplateChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez un modèle" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 ml-auto">
                  {unsavedChanges && (
                    <Button
                      variant="outline"
                      onClick={discardChanges}
                      disabled={saving || !unsavedChanges}
                    >
                      <Undo className="h-4 w-4 mr-2" />
                      Annuler
                    </Button>
                  )}
                  
                  <Button
                    onClick={saveTemplate}
                    disabled={saving || !unsavedChanges}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    variant="default"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Sauvegarder
                      </>
                    )}
                  </Button>
                  
                  {currentTemplate && (
                    <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Supprimer le modèle</DialogTitle>
                        </DialogHeader>
                        <p className="py-4">
                          Êtes-vous sûr de vouloir supprimer le modèle "{currentTemplate.name}" ?
                          Cette action est irréversible.
                        </p>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Annuler
                          </Button>
                          <Button variant="destructive" onClick={deleteTemplate}>
                            Supprimer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
              
              {templates.length === 0 && !workingTemplate ? (
                <div className="text-center py-12 border rounded-md border-dashed">
                  <p className="text-muted-foreground mb-4">
                    Aucun modèle PDF n'a été créé. Créez votre premier modèle pour commencer.
                  </p>
                  <Button onClick={() => setShowNewTemplateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un modèle
                  </Button>
                </div>
              ) : workingTemplate && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="company">Informations de l'entreprise</TabsTrigger>
                    <TabsTrigger value="pages">Pages du modèle</TabsTrigger>
                    <TabsTrigger value="fields">Champs et positionnement</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="company" className="mt-6">
                    <PDFCompanyInfo 
                      template={workingTemplate} 
                      onSave={handleCompanyInfoUpdate} 
                      loading={saving}
                    />
                  </TabsContent>
                  
                  <TabsContent value="pages" className="mt-6">
                    <PDFTemplateWithFields 
                      template={workingTemplate}
                      onSave={handleTemplateUpdate}
                      activeTab="template"
                    />
                  </TabsContent>
                  
                  <TabsContent value="fields" className="mt-6">
                    <PDFTemplateWithFields 
                      template={workingTemplate}
                      onSave={handleTemplateUpdate}
                      activeTab="fields"
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </>
        )}
      </CardContent>
      {unsavedChanges && (
        <CardFooter className="bg-yellow-50 border-t border-yellow-200">
          <div className="flex w-full items-center justify-between">
            <p className="text-sm text-yellow-800 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Vous avez des modifications non sauvegardées.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={discardChanges}
                size="sm"
              >
                <Undo className="h-3 w-3 mr-2" />
                Annuler
              </Button>
              <Button 
                onClick={saveTemplate} 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                variant="default"
                size="sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
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
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default PDFTemplateManager;
