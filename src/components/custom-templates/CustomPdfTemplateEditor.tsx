import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Settings, Palette, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  ExtendedCustomPdfTemplate, 
  CustomPdfTemplateField, 
  FieldDefinition 
} from "@/types/customPdfTemplateField";
import { CustomPdfFieldMapper } from "@/services/customPdfFieldMapper";
import { CustomPdfTemplateAdapter } from "@/services/customPdfTemplateAdapter";
import customPdfTemplateService from "@/services/customPdfTemplateService";
import FieldPalette from "./FieldPalette";
import CustomPdfCanvas from "./CustomPdfCanvas";
import FieldPropertiesPanel from "./FieldPropertiesPanel";
import { AdvancedToolbar } from "./AdvancedToolbar";
import { FieldAlignmentGuides } from "./FieldAlignmentGuides";
import { StylePresetsPanel } from "./StylePresetsPanel";

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
  const [template, setTemplate] = useState<ExtendedCustomPdfTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("fields");
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

  // Chargement du template
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        const templateData = await customPdfTemplateService.getTemplate(templateId);
        
        if (templateData) {
          const extendedTemplate = CustomPdfTemplateAdapter.toExtended(templateData);
          setTemplate(extendedTemplate);
        } else {
          throw new Error("Template non trouvé");
        }
      } catch (error) {
        console.error("Erreur lors du chargement du template:", error);
        toast.error("Impossible de charger le template");
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId]);

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
    toast.success(`Champ "${fieldDef.label}" ajouté`);
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
    toast.success("Champ supprimé");
  }, [template]);

  // Sauvegarde du template
  const handleSave = async () => {
    if (!template) return;

    try {
      setSaving(true);
      
      const templateToSave = CustomPdfTemplateAdapter.fromExtended({
        ...template,
        updated_at: new Date().toISOString()
      });
      
      await customPdfTemplateService.updateTemplate(template.id, templateToSave);
      
      setHasUnsavedChanges(false);
      toast.success("Template sauvegardé avec succès");
      
      if (onSave) {
        onSave(template);
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
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
      toast.success(`${selectedFieldIds.length} champ(s) copié(s)`);
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
    toast.success(`${selectedFieldIds.length} champ(s) supprimé(s)`);
  }, [template, selectedFieldIds]);

  const handlePreview = useCallback(() => {
    toast.info("Aperçu en cours de développement");
  }, []);

  // Obtenir le champ sélectionné
  const selectedField = template?.fields.find(field => field.id === selectedFieldId) || null;

  const handleApplyStylePreset = useCallback((style: Partial<CustomPdfTemplateField['style']>) => {
    if (!selectedFieldId) {
      toast.error("Veuillez sélectionner un champ");
      return;
    }
    
    handleFieldUpdate(selectedFieldId, { style: { ...selectedField?.style, ...style } });
    toast.success("Style appliqué");
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

  const totalPages = template.pages_data.length;

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
        {/* Sidebar gauche */}
        <div className="w-80 border-r border-border bg-card">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-2">
              <TabsTrigger value="fields" className="flex items-center gap-1 text-xs">
                <Palette className="h-3 w-3" />
                Champs
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex items-center gap-1 text-xs">
                <Settings className="h-3 w-3" />
                Propriétés
              </TabsTrigger>
              <TabsTrigger value="styles" className="flex items-center gap-1 text-xs">
                <Eye className="h-3 w-3" />
                Styles
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent value="fields" className="h-full m-2 mt-0">
                <FieldPalette
                  onFieldAdd={handleFieldAdd}
                  className="h-full"
                />
              </TabsContent>
              
              <TabsContent value="properties" className="h-full m-2 mt-0">
                <FieldPropertiesPanel
                  field={selectedField}
                  onFieldUpdate={handleFieldUpdate}
                  onFieldDelete={handleFieldDelete}
                  className="h-full"
                />
              </TabsContent>

              <TabsContent value="styles" className="h-full m-2 mt-0">
                <StylePresetsPanel
                  onApplyPreset={handleApplyStylePreset}
                  selectedFieldType={selectedField?.type}
                  className="h-full"
                />
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
      </div>
    </div>
  );
};

export default CustomPdfTemplateEditor;