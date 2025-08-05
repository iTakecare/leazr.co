import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Settings, Palette, FileText, Loader2, History, Users, MessageSquare, BarChart3, Share2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  ExtendedCustomPdfTemplate, 
  CustomPdfTemplateField, 
  FieldDefinition 
} from "@/types/customPdfTemplateField";
import { CustomPdfFieldMapper } from "@/services/customPdfFieldMapper";

import customPdfTemplateService from "@/services/customPdfTemplateService";
import FieldPalette from "./FieldPalette";
import CustomPdfCanvas from "./CustomPdfCanvas";
import FieldPropertiesPanel from "./FieldPropertiesPanel";
import { AdvancedToolbar } from "./AdvancedToolbar";
import { FieldAlignmentGuides } from "./FieldAlignmentGuides";
import { StylePresetsPanel } from "./StylePresetsPanel";
import { PdfTemplateUploader } from "@/components/templates/PdfTemplateUploader";
// Phase 5: Import des nouveaux composants
import { VersionHistory } from './VersionHistory';
import { CollaborationPanel } from './CollaborationPanel';
import { CommentSystem } from './CommentSystem';
import { TemplateAnalytics } from './TemplateAnalytics';
import { PDFPreviewDialog } from './PDFPreviewDialog';

interface CustomPdfTemplateEditorProps {
  clientId: string;
  templateId?: string;
  onSave?: (template: ExtendedCustomPdfTemplate) => void;
  onClose?: () => void;
}

const CustomPdfTemplateEditor: React.FC<CustomPdfTemplateEditorProps> = ({
  clientId,
  templateId,
  onSave,
  onClose
}) => {
  const { toast } = useToast();
  const [template, setTemplate] = useState<ExtendedCustomPdfTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("fields");
  const [pdfFileExists, setPdfFileExists] = useState<boolean>(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [activeTool, setActiveTool] = useState<'select' | 'move'>('select');
  const [undoStack, setUndoStack] = useState<ExtendedCustomPdfTemplate[]>([]);
  const [redoStack, setRedoStack] = useState<ExtendedCustomPdfTemplate[]>([]);
  const [alignmentGuides, setAlignmentGuides] = useState<any[]>([]);
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);

  // Données d'exemple pour la prévisualisation
  const sampleData = CustomPdfFieldMapper.generateSampleData();

  // Gestion de l'upload PDF
  const handlePdfUpload = useCallback((templateUrl: string, metadata: any) => {
    if (!template) return;
    
    console.log('📥 Upload PDF - Métadonnées reçues:', metadata);
    
    // Mettre à jour les pages_data si disponibles dans les métadonnées
    const updatedPagesData = metadata.pages_data || template.pages_data;
    
    setTemplate(prev => prev ? {
      ...prev,
      original_pdf_url: templateUrl,
      pages_data: updatedPagesData,
      template_metadata: {
        ...prev.template_metadata,
        ...metadata,
        pages_data: updatedPagesData
      }
    } : null);
    
    setHasUnsavedChanges(true);
    const pageCount = metadata.pages_count || 1;
    toast({
      title: "Succès",
      description: `PDF téléchargé avec succès (${pageCount} page${pageCount > 1 ? 's' : ''})`,
    });
  }, [template]);

  // Fonction pour créer un nouveau template
  const createNewTemplate = useCallback(() => {
    const newTemplate: ExtendedCustomPdfTemplate = {
      id: `temp_${Date.now()}`,
      name: "Nouveau Template",
      company_id: "", // Sera défini lors de la sauvegarde
      original_pdf_url: "", // Sera défini lors de l'upload
      fields: [],
      pages_data: [
        {
          page_number: 1,
          image_url: "",
          dimensions: { width: 595, height: 842 }
        }
      ],
      template_metadata: {
        pages_count: 1,
        file_type: "application/pdf"
      },
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setTemplate(newTemplate);
    setLoading(false);
  }, [clientId]);

  // Chargement du template ou création d'un nouveau
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        
        // Si aucun templateId, créer un nouveau template
        if (!templateId) {
          createNewTemplate();
          return;
        }
        
        console.log('📥 Chargement du template:', templateId);
        const templateData = await customPdfTemplateService.getTemplate(templateId);
        
        if (templateData) {
          console.log('✅ Template chargé:', templateData.name);
          
          // Vérifier si le fichier PDF existe encore
          if (templateData.original_pdf_url) {
            try {
              const response = await fetch(templateData.original_pdf_url, { method: 'HEAD' });
              setPdfFileExists(response.ok);
              if (!response.ok) {
                console.warn('⚠️ PDF inaccessible pour le template:', templateId);
                toast({
                  title: "Attention",
                  description: "Le fichier PDF de ce template n'est plus accessible",
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.warn("Impossible de vérifier l'existence du fichier PDF:", error);
              setPdfFileExists(false);
            }
          } else {
            console.warn('⚠️ Template sans URL PDF:', templateId);
            setPdfFileExists(false);
          }
          
          // Convert to ExtendedCustomPdfTemplate format avec gestion d'erreur
          try {
            const convertedTemplate: ExtendedCustomPdfTemplate = {
              ...templateData,
              fields: templateData.field_mappings?.fields || [],
              pages_data: (templateData.template_metadata as any)?.pages_data || [
                {
                  page_number: 1,
                  image_url: "",
                  dimensions: { width: 595, height: 842 }
                }
              ]
            };
            setTemplate(convertedTemplate);
            console.log('✅ Template converti et défini');
          } catch (conversionError) {
            console.error('💥 Erreur de conversion du template:', conversionError);
            throw new Error("Données du template corrompues");
          }
        } else {
          throw new Error("Template non trouvé");
        }
      } catch (error: any) {
        console.error("💥 Erreur lors du chargement du template:", error);
        const errorMessage = error.message === "Template non trouvé" 
          ? "Ce template n'existe pas ou a été supprimé"
          : "Impossible de charger le template";
        
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive"
        });
        
        // Rediriger ou fermer l'éditeur en cas d'erreur critique
        if (onClose) {
          setTimeout(() => onClose(), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, createNewTemplate, onClose]);

  // Gestion de l'ajout d'un champ depuis la palette
  const handleFieldAdd = useCallback((fieldDef: FieldDefinition) => {
    if (!template) return;

    const newField: CustomPdfTemplateField = {
      id: `${fieldDef.id}_${Date.now()}`,
      type: fieldDef.type,
      label: fieldDef.label,
      mapping_key: fieldDef.mapping_key,
      position: {
        x: 20 + (template.fields.length * 5), // Décalage automatique
        y: 20 + (template.fields.length * 5),
        page: currentPage
      },
      style: {
        ...fieldDef.defaultStyle,
        fontSize: fieldDef.defaultStyle.fontSize || 12,
        fontFamily: fieldDef.defaultStyle.fontFamily || 'Arial',
        color: fieldDef.defaultStyle.color || '#000000',
        fontWeight: fieldDef.defaultStyle.fontWeight || 'normal',
        textAlign: fieldDef.defaultStyle.textAlign || 'left'
      },
      format: fieldDef.format,
      isVisible: true
    };

    setTemplate(prev => prev ? {
      ...prev,
      fields: [...prev.fields, newField]
    } : null);
    
    setSelectedFieldId(newField.id);
    setHasUnsavedChanges(true);
    toast({
      title: "Succès",
      description: `Champ "${fieldDef.label}" ajouté`,
    });
  }, [template, currentPage]);

  // Gestion de la mise à jour d'un champ
  const handleFieldUpdate = useCallback((fieldId: string, updates: Partial<CustomPdfTemplateField>) => {
    if (!template) return;

    setTemplate(prev => prev ? {
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    } : null);
    
    setHasUnsavedChanges(true);
  }, [template]);

  // Gestion du déplacement d'un champ
  const handleFieldMove = useCallback((fieldId: string, position: { x: number; y: number }) => {
    if (!template) return;

    setTemplate(prev => prev ? {
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId 
          ? { ...field, position: { ...field.position, ...position } }
          : field
      )
    } : null);
    
    setHasUnsavedChanges(true);
  }, [template]);

  // Gestion de la suppression d'un champ
  const handleFieldDelete = useCallback((fieldId: string) => {
    if (!template) return;

    setTemplate(prev => prev ? {
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    } : null);
    
    setSelectedFieldId(null);
    setHasUnsavedChanges(true);
    toast({
      title: "Succès",
      description: "Champ supprimé",
    });
  }, [template]);

  // Vérification préalable avant sauvegarde
  const canSave = useMemo(() => {
    if (!template) return false;
    
    // Vérifications de base
    if (!template.name || template.name.trim().length === 0) return false;
    
    // Pour un nouveau template, vérifier qu'il y a du contenu (PDF ou images)
    if (template.id.startsWith('temp_')) {
      const isImageBased = (template.template_metadata as any)?.template_type === 'image-based';
      if (isImageBased) {
        // Pour templates image : vérifier qu'il y a des pages avec images
        if (!template.template_metadata?.pages_data || template.template_metadata.pages_data.length === 0) {
          return false;
        }
      } else {
        // Pour templates PDF : vérifier qu'il y a un URL PDF
        if (!template.original_pdf_url || template.original_pdf_url.trim().length === 0) {
          return false;
        }
      }
    }
    
    return true;
  }, [template]);

  // Message d'erreur pour la sauvegarde
  const getSaveErrorMessage = () => {
    if (!template) return "Aucun template";
    if (!template.name || template.name.trim().length === 0) return "Nom du template requis";
    if (template.id.startsWith('temp_')) {
      const isImageBased = (template.template_metadata as any)?.template_type === 'image-based';
      if (isImageBased) {
        if (!template.template_metadata?.pages_data || template.template_metadata.pages_data.length === 0) {
          return "Images requises pour nouveau template";
        }
      } else {
        if (!template.original_pdf_url || template.original_pdf_url.trim().length === 0) {
          return "PDF requis pour nouveau template";
        }
      }
    }
    return undefined;
  };

  // Sauvegarde du template
  const handleSave = async () => {
    if (!template) {
      toast({
        title: "Erreur",
        description: "Aucun template à sauvegarder",
        variant: "destructive"
      });
      return;
    }

    // Vérifications préalables
    if (!canSave) {
      toast({
        title: "Erreur",
        description: "Veuillez compléter toutes les informations obligatoires",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      console.log('💾 Début de la sauvegarde du template:', template.name);
      
      const templateToSave = {
        ...template,
        updated_at: new Date().toISOString()
      };
      
      // Si c'est un nouveau template (ID temporaire), créer, sinon mettre à jour
      if (template.id.startsWith('temp_')) {
        console.log('🆕 Création d\'un nouveau template...');
        
        const createData = {
          name: template.name,
          original_pdf_url: template.original_pdf_url || "",
          field_mappings: {
            fields: template.fields,
            pages_data: template.pages_data
          },
          template_metadata: template.template_metadata,
          is_active: false
        };
        
        console.log('📋 Données de création:', createData);
        
        const newTemplate = await customPdfTemplateService.createTemplate(createData);
        
        // Mettre à jour l'état avec le nouveau template
        // Convert to ExtendedCustomPdfTemplate format
        const convertedTemplate: ExtendedCustomPdfTemplate = {
          ...newTemplate,
          fields: newTemplate.field_mappings?.fields || [],
          pages_data: (newTemplate.template_metadata as any)?.pages_data || []
        };
        setTemplate(convertedTemplate);
        toast({
          title: "Succès",
          description: "Template créé avec succès",
        });
        console.log('✅ Template créé avec l\'ID:', newTemplate.id);
      } else {
        console.log('📝 Mise à jour du template existant...');
        await customPdfTemplateService.updateTemplate(template.id, templateToSave);
        toast({
          title: "Succès",
          description: "Template sauvegardé avec succès",
        });
        console.log('✅ Template mis à jour:', template.id);
      }
      
      setHasUnsavedChanges(false);
      
      if (onSave) {
        onSave(template);
      }
    } catch (error: any) {
      console.error("💥 Erreur lors de la sauvegarde:", error);
      
      // Messages d'erreur plus spécifiques
      let errorMessage = "Erreur lors de la sauvegarde";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Messages spécifiques selon le type d'erreur
      if (errorMessage.includes('authentifié')) {
        errorMessage = "Vous devez être connecté pour sauvegarder";
      } else if (errorMessage.includes('entreprise')) {
        errorMessage = "Problème d'association à votre entreprise";
      } else if (errorMessage.includes('client')) {
        errorMessage = "Problème avec les données du client";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Nouvelles fonctions pour la toolbar avancée
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => template ? [...prev, template] : prev);
      setUndoStack(prev => prev.slice(0, -1));
      setTemplate(previousState);
    }
  }, [undoStack, template]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => template ? [...prev, template] : prev);
      setRedoStack(prev => prev.slice(0, -1));
      setTemplate(nextState);
    }
  }, [redoStack, template]);

  const handleCopySelected = useCallback(() => {
    if (selectedFieldIds.length > 0) {
      // Logique de copie - pour l'instant, toast informatif
      toast({
        title: "Succès",
        description: `${selectedFieldIds.length} champ(s) copié(s)`,
      });
    }
  }, [selectedFieldIds]);

  const handleDeleteSelected = useCallback(() => {
    if (!template || selectedFieldIds.length === 0) return;

    setTemplate(prev => prev ? {
      ...prev,
      fields: prev.fields.filter(field => !selectedFieldIds.includes(field.id))
    } : null);
    
    setSelectedFieldIds([]);
    setSelectedFieldId(null);
    setHasUnsavedChanges(true);
    toast({
      title: "Succès",
      description: `${selectedFieldIds.length} champ(s) supprimé(s)`,
    });
  }, [template, selectedFieldIds]);

  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  // Obtenir le champ sélectionné
  const selectedField = template?.fields.find(field => field.id === selectedFieldId) || null;

  const handleApplyStylePreset = useCallback((style: Partial<CustomPdfTemplateField['style']>) => {
    if (!selectedFieldId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un champ",
        variant: "destructive"
      });
      return;
    }
    
    handleFieldUpdate(selectedFieldId, { style: { ...selectedField?.style, ...style } });
    toast({
      title: "Succès",
      description: "Style appliqué",
    });
  }, [selectedFieldId, selectedField, handleFieldUpdate]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            handleSave();
            break;
          case 'z':
            if (!event.shiftKey) {
              event.preventDefault();
              handleUndo();
            }
            break;
          case 'y':
            event.preventDefault();
            handleRedo();
            break;
        }
      } else if (event.key === 'Delete' && selectedFieldIds.length > 0) {
        event.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo, handleDeleteSelected, selectedFieldIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement du template...</span>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Template non trouvé</p>
      </div>
    );
  }

  // Vérifier si c'est un nouveau template sans PDF (ou sans images pour templates image-based)
  const isImageBasedTemplate = (template.template_metadata as any)?.template_type === 'image-based';
  const isNewTemplateWithoutContent = template.id.startsWith('temp_') && 
    (isImageBasedTemplate ? 
      (!template.template_metadata?.pages_data || template.template_metadata.pages_data.length === 0) :
      !template.original_pdf_url
    );

  const totalPages = template.template_metadata?.pages_count || template.pages_data?.length || 1;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar avancée */}
      <AdvancedToolbar
        onSave={handleSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleGrid={() => setGridVisible(!gridVisible)}
        onZoomIn={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
        onZoomOut={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
        onPreview={handlePreview}
        onCopySelected={handleCopySelected}
        onDeleteSelected={handleDeleteSelected}
        zoomLevel={zoomLevel}
        hasUnsavedChanges={hasUnsavedChanges}
        selectedFieldsCount={selectedFieldIds.length}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        gridVisible={gridVisible}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        canSave={canSave}
        saving={saving}
        saveErrorMessage={!canSave ? getSaveErrorMessage() : undefined}
      />

      {/* En-tête du template */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {template.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {template.fields.length} champ{template.fields.length > 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {totalPages} page{totalPages > 1 ? 's' : ''}
              </Badge>
              {hasUnsavedChanges && (
                <Badge variant="destructive" className="text-xs">
                  Non sauvegardé
                </Badge>
              )}
            </div>
          </div>
          
          {/* Navigation pages */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
              >
                ← Précédent
              </Button>
              <span className="text-sm font-medium px-3 py-1 bg-muted rounded">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Suivant →
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Interface principale */}
      <div className="flex-1 flex min-h-0">
        {/* Condition d'affichage : upload PDF/Images d'abord pour nouveaux templates */}
        {isNewTemplateWithoutContent ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="w-full max-w-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">
                  {isImageBasedTemplate ? 
                    "Ce template utilise des images directement" : 
                    "Commencez par uploader votre template PDF"
                  }
                </CardTitle>
                <p className="text-muted-foreground">
                  {isImageBasedTemplate ?
                    "Vous devez d'abord créer ce template via l'assistant de création d'images" :
                    "Téléchargez votre fichier PDF pour pouvoir placer les champs et configurer votre template"
                  }
                </p>
              </CardHeader>
              <CardContent>
                {!isImageBasedTemplate && (
                  <PdfTemplateUploader
                    onTemplateUploaded={handlePdfUpload}
                    currentTemplateUrl={template.original_pdf_url}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Avertissement PDF manquant - seulement pour templates PDF */}
            {!isImageBasedTemplate && !pdfFileExists && template.original_pdf_url && (
              <div className="w-full bg-destructive/10 border border-destructive/20 p-3 text-sm">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <strong>Fichier PDF manquant</strong>
                </div>
                <p className="text-muted-foreground mt-1">
                  Le fichier PDF de ce template n'existe plus dans le bucket. 
                  Veuillez re-uploader un PDF pour restaurer les fonctionnalités d'édition.
                </p>
              </div>
            )}
            
            {/* Sidebar gauche */}
            <div className="w-96 border-r border-border bg-card">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b border-border p-2">
              <TabsList className="grid w-full grid-cols-4 gap-1 h-auto">
                <TabsTrigger value="fields" className="flex flex-col items-center gap-1 p-2 text-xs">
                  <Palette className="h-4 w-4" />
                  <span>Champs</span>
                </TabsTrigger>
                <TabsTrigger value="properties" className="flex flex-col items-center gap-1 p-2 text-xs">
                  <Settings className="h-4 w-4" />
                  <span>Propriétés</span>
                </TabsTrigger>
                <TabsTrigger value="styles" className="flex flex-col items-center gap-1 p-2 text-xs">
                  <Eye className="h-4 w-4" />
                  <span>Styles</span>
                </TabsTrigger>
                <TabsTrigger value="versions" className="flex flex-col items-center gap-1 p-2 text-xs">
                  <History className="h-4 w-4" />
                  <span>Versions</span>
                </TabsTrigger>
              </TabsList>
              <TabsList className="grid w-full grid-cols-4 gap-1 h-auto mt-1">
                <TabsTrigger value="collaboration" className="flex flex-col items-center gap-1 p-2 text-xs">
                  <Users className="h-4 w-4" />
                  <span>Collab</span>
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex flex-col items-center gap-1 p-2 text-xs">
                  <MessageSquare className="h-4 w-4" />
                  <span>Comments</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex flex-col items-center gap-1 p-2 text-xs">
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="sharing" className="flex flex-col items-center gap-1 p-2 text-xs">
                  <Share2 className="h-4 w-4" />
                  <span>Partage</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent value="fields" className="h-full p-2 overflow-auto">
                <FieldPalette
                  onFieldAdd={handleFieldAdd}
                  className="h-full"
                />
              </TabsContent>
              
              <TabsContent value="properties" className="h-full p-2 overflow-auto">
                <FieldPropertiesPanel
                  field={selectedField}
                  onFieldUpdate={handleFieldUpdate}
                  onFieldDelete={handleFieldDelete}
                  className="h-full"
                />
              </TabsContent>

              <TabsContent value="styles" className="h-full p-2 overflow-auto">
                <StylePresetsPanel
                  onApplyPreset={handleApplyStylePreset}
                  selectedFieldType={selectedField?.type}
                  className="h-full"
                />
              </TabsContent>

              {/* Phase 5: Nouveaux onglets */}
              <TabsContent value="versions" className="h-full p-2 overflow-auto">
                <VersionHistory
                  templateId={template.id.startsWith('temp_') ? undefined : template.id}
                />
              </TabsContent>
              
              <TabsContent value="collaboration" className="h-full p-2 overflow-auto">
                <CollaborationPanel 
                  templateId={template.id.startsWith('temp_') ? undefined : template.id} 
                />
              </TabsContent>
              
              <TabsContent value="comments" className="h-full p-2 overflow-auto">
                <CommentSystem 
                  templateId={template.id.startsWith('temp_') ? undefined : template.id}
                  fieldId={selectedFieldId || undefined}
                />
              </TabsContent>
              
              <TabsContent value="analytics" className="h-full p-2 overflow-auto">
                <TemplateAnalytics 
                  templateId={template.id.startsWith('temp_') ? undefined : template.id} 
                />
              </TabsContent>
              
              <TabsContent value="sharing" className="h-full p-2 overflow-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      Partage et Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full" variant="outline">
                      <Share2 className="h-4 w-4 mr-2" />
                      Partager avec une entreprise
                    </Button>
                    <Button className="w-full" variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Exporter en JSON
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Palette className="h-4 w-4 mr-2" />
                      Publier dans la bibliothèque
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Canvas principal */}
        <div className="flex-1 relative" ref={canvasRef}>
          <CustomPdfCanvas
            template={template}
            currentPage={currentPage}
            zoomLevel={zoomLevel}
            selectedFieldId={selectedFieldId}
            sampleData={sampleData}
            onFieldSelect={setSelectedFieldId}
            onFieldMove={handleFieldMove}
            className="h-full"
          />
          
          {/* Guides d'alignement */}
          <FieldAlignmentGuides
            guides={alignmentGuides}
            containerRef={canvasRef}
            zoomLevel={zoomLevel}
          />
        </div>
          </>
        )}
      </div>

      {/* Dialog d'aperçu */}
      <PDFPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        template={template}
        sampleData={sampleData}
      />
    </div>
  );
};

export default CustomPdfTemplateEditor;