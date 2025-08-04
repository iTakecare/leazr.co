import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Edit, Trash2, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getActiveTemplateByClient, 
  getTemplatesByCompany, 
  createTemplate, 
  deleteTemplate,
  activateTemplate 
} from '@/services/customPdfTemplateService';
import { CustomPdfTemplate } from '@/types/customPdfTemplate';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomPdfTemplateEditor from './CustomPdfTemplateEditor';

interface CustomPdfTemplateManagerProps {
  clientId: string;
}

/**
 * Composant de gestion des templates PDF personnalisés pour un client
 */
export const CustomPdfTemplateManager: React.FC<CustomPdfTemplateManagerProps> = ({ clientId }) => {
  const [activeTemplate, setActiveTemplate] = useState<CustomPdfTemplate | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<CustomPdfTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Charger les templates au montage
  useEffect(() => {
    loadTemplates();
  }, [clientId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      // Charger le template actif pour ce client
      const active = await getActiveTemplateByClient(clientId);
      setActiveTemplate(active);
      
      // Charger tous les templates de l'entreprise
      const allTemplates = await getTemplatesByCompany();
      setAvailableTemplates(allTemplates);
      
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      toast.error('Impossible de charger les templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadTemplate = () => {
    // Ouvrir l'éditeur pour créer un nouveau template
    setSelectedTemplateId(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowEditor(true);
  };

  const handleActivateTemplate = async (templateId: string) => {
    try {
      await activateTemplate(templateId, clientId);
      toast.success('Template activé avec succès');
      await loadTemplates(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de l\'activation:', error);
      toast.error('Erreur lors de l\'activation du template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) {
      return;
    }

    try {
      await deleteTemplate(templateId);
      toast.success('Template supprimé');
      await loadTemplates();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEditorClose = async (saved: boolean) => {
    setShowEditor(false);
    setSelectedTemplateId(null);
    
    if (saved) {
      await loadTemplates();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="ml-2">Chargement des templates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Template actif */}
      {activeTemplate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {activeTemplate.name}
                  <Badge variant="default" className="text-xs">Actif</Badge>
                </CardTitle>
                <CardDescription>
                  {activeTemplate.description || 'Template PDF personnalisé actif pour ce client'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTemplate(activeTemplate.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Actions principales */}
      <div className="flex gap-2">
        <Button onClick={handleUploadTemplate} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          {activeTemplate ? 'Nouveau template' : 'Uploader un template'}
        </Button>
      </div>

      {/* Liste des templates disponibles */}
      {availableTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Templates disponibles</CardTitle>
            <CardDescription>
              Sélectionnez un template à activer pour ce client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    {template.id === activeTemplate?.id && (
                      <Badge variant="default" className="text-xs">Actif</Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {template.id !== activeTemplate?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivateTemplate(template.id)}
                    >
                      Activer
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* État vide */}
      {!activeTemplate && availableTemplates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun template personnalisé</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Ce client utilisera le template standard. Uploadez un template PDF personnalisé 
              pour créer des offres avec votre propre design.
            </p>
            <Button onClick={handleUploadTemplate} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Uploader mon premier template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Éditeur de template */}
      <Dialog open={showEditor} onOpenChange={(open) => !open && handleEditorClose(false)}>
        <DialogContent className="max-w-7xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplateId ? 'Modifier le template' : 'Nouveau template PDF'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <CustomPdfTemplateEditor
              clientId={clientId}
              templateId={selectedTemplateId || undefined}
              onClose={() => handleEditorClose(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};