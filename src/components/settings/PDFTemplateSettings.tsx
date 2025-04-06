
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Loader2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { generateTemplateId } from "@/lib/utils";
import PDFTemplateEditor from "./pdf-template/PDFTemplateEditor";
import PDFTemplatePreview from "./pdf-template/PDFTemplatePreview";
import { getAllPDFTemplates, loadPDFTemplate, savePDFTemplate, deletePDFTemplate, DEFAULT_MODEL } from "@/utils/pdfTemplateUtils";

const PDFTemplateSettings = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default");
  const [activeTab, setActiveTab] = useState("edit");
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Charger la liste des modèles au montage du composant
  useEffect(() => {
    loadTemplatesList();
  }, []);

  // Charger le modèle sélectionné
  useEffect(() => {
    if (selectedTemplateId) {
      loadSelectedTemplate(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  // Charger la liste des modèles
  const loadTemplatesList = async () => {
    try {
      setLoading(true);
      const allTemplates = await getAllPDFTemplates();
      setTemplates(allTemplates);
      
      if (allTemplates.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(allTemplates[0].id);
      }
    } catch (err: any) {
      console.error("Erreur lors du chargement des modèles:", err);
      setError("Impossible de charger la liste des modèles");
      toast.error("Erreur lors du chargement des modèles");
    } finally {
      setLoading(false);
    }
  };

  // Charger un modèle spécifique
  const loadSelectedTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const templateData = await loadPDFTemplate(templateId);
      
      if (templateData) {
        setTemplate(templateData);
        toast.success(`Modèle "${templateData.name}" chargé`);
      } else {
        setTemplate(DEFAULT_MODEL);
        toast.info("Modèle par défaut chargé");
      }
    } catch (err: any) {
      console.error("Erreur lors du chargement du modèle:", err);
      setError("Impossible de charger le modèle");
      toast.error("Erreur lors du chargement du modèle");
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les modifications au modèle
  const handleSaveTemplate = async () => {
    if (!template) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await savePDFTemplate(template);
      toast.success("Modèle enregistré avec succès");
      await loadTemplatesList(); // Recharger la liste après sauvegarde
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde:", err);
      setError("Impossible de sauvegarder le modèle");
      toast.error("Erreur lors de la sauvegarde du modèle");
    } finally {
      setSaving(false);
    }
  };

  // Créer un nouveau modèle
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Veuillez saisir un nom pour le modèle");
      return;
    }
    
    try {
      setIsCreating(true);
      setError(null);
      
      const newTemplateId = generateTemplateId();
      const newTemplate = {
        ...DEFAULT_MODEL,
        id: newTemplateId,
        name: newTemplateName.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await savePDFTemplate(newTemplate);
      toast.success("Nouveau modèle créé avec succès");
      setIsCreateDialogOpen(false);
      setNewTemplateName("");
      
      await loadTemplatesList();
      setSelectedTemplateId(newTemplateId);
    } catch (err: any) {
      console.error("Erreur lors de la création du modèle:", err);
      setError("Impossible de créer le modèle");
      toast.error("Erreur lors de la création du modèle");
    } finally {
      setIsCreating(false);
    }
  };

  // Mettre à jour le modèle
  const handleTemplateChange = (field: string, value: any) => {
    if (!template) return;
    
    setTemplate({
      ...template,
      [field]: value,
      updated_at: new Date().toISOString()
    });
  };

  // Supprimer un modèle
  const handleDeleteTemplate = async () => {
    if (selectedTemplateId === 'default') {
      toast.error("Le modèle par défaut ne peut pas être supprimé");
      return;
    }
    
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce modèle ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await deletePDFTemplate(selectedTemplateId);
      toast.success("Modèle supprimé avec succès");
      
      await loadTemplatesList();
      setSelectedTemplateId('default'); // Revenir au modèle par défaut
    } catch (err: any) {
      console.error("Erreur lors de la suppression:", err);
      setError("Impossible de supprimer le modèle");
      toast.error("Erreur lors de la suppression du modèle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestion des modèles PDF</CardTitle>
            <CardDescription>
              Personnalisez les modèles utilisés pour générer les documents PDF
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau modèle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau modèle</DialogTitle>
                  <DialogDescription>
                    Ce modèle sera basé sur le modèle par défaut que vous pourrez ensuite personnaliser.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="template-name">Nom du modèle</Label>
                  <Input 
                    id="template-name" 
                    value={newTemplateName} 
                    onChange={(e) => setNewTemplateName(e.target.value)} 
                    placeholder="Mon modèle personnalisé"
                    className="mt-1" 
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
                  <Button 
                    onClick={handleCreateTemplate} 
                    disabled={isCreating || !newTemplateName.trim()}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Création...
                      </>
                    ) : (
                      "Créer"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSaveTemplate} 
              disabled={saving || loading || !template}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-64">
            <Label htmlFor="template-selector" className="mb-2 block">Sélectionner un modèle</Label>
            <Select 
              value={selectedTemplateId} 
              onValueChange={setSelectedTemplateId}
              disabled={loading}
            >
              <SelectTrigger id="template-selector">
                <SelectValue placeholder="Sélectionnez un modèle" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tmpl) => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadSelectedTemplate(selectedTemplateId)}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
          
          {selectedTemplateId !== 'default' && (
            <div className="flex items-end ml-auto">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDeleteTemplate}
                disabled={loading || selectedTemplateId === 'default'}
              >
                Supprimer
              </Button>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : template ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="edit">Édition</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit">
              <PDFTemplateEditor 
                template={template} 
                onChange={(updatedTemplate) => setTemplate(updatedTemplate)} 
              />
            </TabsContent>
            
            <TabsContent value="preview">
              <PDFTemplatePreview 
                template={template} 
                onSave={(updatedPositions) => {
                  setTemplate({
                    ...template,
                    fields: updatedPositions,
                    updated_at: new Date().toISOString()
                  });
                }}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucun modèle sélectionné</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFTemplateSettings;
