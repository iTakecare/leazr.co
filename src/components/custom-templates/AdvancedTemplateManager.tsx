import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Library, 
  FileText, 
  Search, 
  Filter, 
  Upload, 
  Download, 
  Star, 
  BarChart3,
  Users,
  Eye,
  Edit,
  Share2,
  Trash2,
  Type,
  
} from 'lucide-react';

import { TemplateLibrary } from './TemplateLibrary';
import { PdfTemplateUploader } from '../templates/PdfTemplateUploader';
import CustomPdfTemplateEditor from './CustomPdfTemplateEditor';
import customPdfTemplateService from '@/services/customPdfTemplateService';
import { PdfImageGenerator } from '@/services/pdfImageGenerator';
import { SimplePdfImageGenerator } from '@/services/simplePdfImageGenerator';
import { FallbackImageGenerator } from '@/services/fallbackImageGenerator';
import { CustomPdfTemplate } from '@/types/customPdfTemplate';
import { useToast } from "@/hooks/use-toast";
import { getTemplatePreviewImage } from '@/utils/templateImageUtils';

interface AdvancedTemplateManagerProps {
  clientId?: string;
}

export function AdvancedTemplateManager({ clientId }: AdvancedTemplateManagerProps) {
  const { toast } = useToast();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomPdfTemplate | null>(null);
  const [myTemplates, setMyTemplates] = useState<CustomPdfTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToRename, setTemplateToRename] = useState<CustomPdfTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<CustomPdfTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMyTemplates();
  }, []);

  const loadMyTemplates = async () => {
    try {
      const templates = await customPdfTemplateService.getTemplatesByCompany();
      setMyTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };


  const handleTemplateDownload = (template: CustomPdfTemplate) => {
    toast({
      title: "Succès",
      description: "Template téléchargé avec succès",
    });
    // Recharger les templates de l'entreprise
    window.location.reload();
  };

  const handleTemplateUploaded = async (templateUrl: string, metadata: any) => {
    try {
      // Créer un nouveau template avec les données de l'upload
      const templateData = {
        name: metadata.original_name || `Template ${new Date().toLocaleDateString()}`,
        description: 'Template importé via la gestion avancée',
        original_pdf_url: templateUrl,
        field_mappings: {},
        template_metadata: {
          ...metadata,
          pages_data: []
        }
      };

      const newTemplate = await customPdfTemplateService.createTemplate(templateData);
      
      // Générer les images de prévisualisation en arrière-plan
      if (newTemplate?.id) {
        // Essayer d'abord le générateur principal
        PdfImageGenerator.processTemplateImages(templateUrl, newTemplate.id)
          .then((success) => {
            if (success) {
              console.log('✅ Images de prévisualisation générées');
              loadMyTemplates();
              return;
            } else {
              console.log('🔄 Fallback vers générateur simple...');
              // Fallback vers le générateur simple
              return SimplePdfImageGenerator.processSimplePreview(templateUrl, newTemplate.id);
            }
          })
          .then((fallbackSuccess) => {
            if (fallbackSuccess) {
              console.log('✅ Aperçu simple généré');
              loadMyTemplates();
              return;
            } else {
              console.log('🔄 Fallback vers générateur de capture...');
              // Dernière tentative avec capture d'iframe
              return FallbackImageGenerator.processFallbackThumbnail(templateUrl, newTemplate.id);
            }
          })
          .then((finalSuccess) => {
            if (finalSuccess) {
              console.log('✅ Miniature de fallback générée');
              loadMyTemplates();
            } else {
              console.warn('⚠️ Aucune miniature générée, mais template créé');
            }
          })
          .catch((error) => {
            console.error('❌ Erreur génération images:', error);
          });
      }
      
      toast({
        title: "Succès",
        description: "Template créé avec succès",
      });
      setIsImportOpen(false);
      loadMyTemplates(); // Recharger la liste
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du template",
        variant: "destructive"
      });
    }
  };

  const handleEditTemplate = (template: CustomPdfTemplate) => {
    setSelectedTemplate(template);
    setIsEditorOpen(true);
  };

  const handlePreviewTemplate = (template: CustomPdfTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleEditorSave = (updatedTemplate: any) => {
    toast({
      title: "Succès",
      description: "Template sauvegardé avec succès",
    });
    loadMyTemplates(); // Recharger la liste
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setSelectedTemplate(null);
  };

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
    setSelectedTemplate(null);
  };

  const handleRenameTemplate = (template: CustomPdfTemplate) => {
    setTemplateToRename(template);
    setNewTemplateName(template.name);
    setIsRenameDialogOpen(true);
  };

  const handleDeleteTemplate = (template: CustomPdfTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const confirmRename = async () => {
    if (!templateToRename || !newTemplateName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du template ne peut pas être vide",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await customPdfTemplateService.updateTemplate(templateToRename.id, {
        name: newTemplateName.trim()
      });
      toast({
        title: "Succès",
        description: "Template renommé avec succès",
      });
      setIsRenameDialogOpen(false);
      setTemplateToRename(null);
      setNewTemplateName('');
      loadMyTemplates();
    } catch (error) {
      console.error('Error renaming template:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du renommage du template",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    setIsLoading(true);
    try {
      await customPdfTemplateService.deleteTemplate(templateToDelete.id);
      toast({
        title: "Succès",
        description: "Template supprimé avec succès",
      });
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
      loadMyTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du template",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header avec statistiques */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Gestionnaire de Templates Avancé
            </h1>
            <p className="text-muted-foreground">
              Gérez, partagez et analysez vos templates PDF personnalisés
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Library className="h-4 w-4 mr-2" />
                  Bibliothèque
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Bibliothèque de Templates</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto">
                  <TemplateLibrary 
                    clientId={clientId}
                    onTemplateDownload={handleTemplateDownload}
                  />
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Importer un Template PDF</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <PdfTemplateUploader onTemplateUploaded={handleTemplateUploaded} />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistiques simplifiées */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mes Templates</p>
                <p className="text-2xl font-bold">{myTemplates.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Templates Actifs</p>
                <p className="text-2xl font-bold">{myTemplates.filter(t => t.is_active).length}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dernière Création</p>
                <p className="text-sm font-medium">
                  {myTemplates.length > 0 
                    ? new Date(Math.max(...myTemplates.map(t => new Date(t.created_at).getTime()))).toLocaleDateString()
                    : 'Aucune'
                  }
                </p>
              </div>
              <Upload className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="invoice">Facture</SelectItem>
              <SelectItem value="contract">Contrat</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
              <SelectItem value="shared">Partagé</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Plus de filtres
          </Button>
        </div>
      </div>

      {/* Contenu principal - Templates uniquement */}
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Mes Templates</h2>
          <p className="text-muted-foreground">Gérez vos templates PDF personnalisés</p>
        </div>

        <div className="space-y-6">
          {myTemplates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Aucun template trouvé</h3>
                <p className="text-muted-foreground mb-4">
                  Commencez par importer votre premier template PDF
                </p>
                <Button onClick={() => setIsImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer un template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTemplates.map((template) => (
                <Card key={template.id} className="relative group hover:shadow-lg transition-shadow">
                  {/* Image de prévisualisation */}
                  <div className="aspect-[3/4] bg-muted border-b overflow-hidden">
                    {(() => {
                      const previewImageUrl = getTemplatePreviewImage(template);
                      return previewImageUrl ? (
                        <img 
                          src={previewImageUrl}
                          alt={`Aperçu de ${template.name}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('Erreur de chargement image template:', template.id, 'URL:', previewImageUrl);
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement!;
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                                <svg class="h-16 w-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                          <FileText className="h-16 w-16 text-blue-400" />
                        </div>
                      );
                    })()}
                  </div>
                  
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm truncate">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {template.description || 'Aucune description'}
                    </p>
                    
                    {/* Métadonnées */}
                    <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                      {template.template_metadata?.pages_count && (
                        <span className="bg-muted px-2 py-1 rounded">
                          {template.template_metadata.pages_count} pages
                        </span>
                      )}
                      <Badge variant={template.is_active ? 'default' : 'secondary'} className="text-xs">
                        {template.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePreviewTemplate(template)}
                        title="Aperçu du template"
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        title="Éditer le template"
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRenameTemplate(template)}
                        title="Renommer le template"
                        className="flex-1"
                      >
                        <Type className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteTemplate(template)}
                        title="Supprimer le template"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog Editor */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[95vw] h-[95vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>
              Éditer le template: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedTemplate && (
              <CustomPdfTemplateEditor
                clientId={clientId || ''}
                templateId={selectedTemplate.id}
                onSave={handleEditorSave}
                onClose={handleEditorClose}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Aperçu: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4">
            {selectedTemplate?.original_pdf_url ? (
              <div className="w-full h-96 border rounded-lg">
                <iframe
                  src={selectedTemplate.original_pdf_url}
                  className="w-full h-full rounded-lg"
                  title={`Aperçu de ${selectedTemplate.name}`}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    Aucun PDF disponible pour ce template
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Rename */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renommer le template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nouveau nom</label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Nom du template"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsRenameDialogOpen(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button 
                onClick={confirmRename}
                disabled={isLoading || !newTemplateName.trim()}
              >
                {isLoading ? 'Renommage...' : 'Renommer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Delete */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer le template "{templateToDelete?.name}" ? 
              Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDelete}
                disabled={isLoading}
              >
                {isLoading ? 'Suppression...' : 'Supprimer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}