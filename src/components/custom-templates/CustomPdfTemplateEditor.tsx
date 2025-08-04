import React, { useState, useCallback, useEffect } from "react";
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
import { customPdfTemplateService } from "@/services/customPdfTemplateService";
import FieldPalette from "./FieldPalette";
import CustomPdfCanvas from "./CustomPdfCanvas";
import FieldPropertiesPanel from "./FieldPropertiesPanel";

interface CustomPdfTemplateEditorProps {
  templateId: string;
  onSave?: (template: ExtendedCustomPdfTemplate) => void;
  onClose?: () => void;
}

const CustomPdfTemplateEditor: React.FC<CustomPdfTemplateEditorProps> = ({
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
  const [activeTab, setActiveTab] = useState("design");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  // Obtenir le champ sélectionné
  const selectedField = template?.fields.find(field => field.id === selectedFieldId) || null;

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
    <div className="h-full flex flex-col">
      {/* En-tête */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {template.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  {template.fields.length} champs
                </Badge>
                <Badge variant="outline">
                  {totalPages} page{totalPages > 1 ? 's' : ''}
                </Badge>
                {hasUnsavedChanges && (
                  <Badge variant="secondary">
                    Modifications non sauvegardées
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
              >
                Zoom -
              </Button>
              <span className="text-sm font-medium px-2">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
              >
                Zoom +
              </Button>
              
              {totalPages > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                  >
                    ← Page
                  </Button>
                  <span className="text-sm px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Page →
                  </Button>
                </>
              )}
              
              <Button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="ml-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Interface principale */}
      <div className="flex-1 grid grid-cols-12 gap-4">
        {/* Palette de champs - Gauche */}
        <div className="col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fields" className="flex items-center gap-1">
                <Palette className="h-4 w-4" />
                Champs
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Propriétés
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="fields" className="mt-4">
              <FieldPalette
                onFieldAdd={handleFieldAdd}
              />
            </TabsContent>
            
            <TabsContent value="properties" className="mt-4">
              <FieldPropertiesPanel
                field={selectedField}
                onFieldUpdate={handleFieldUpdate}
                onFieldDelete={handleFieldDelete}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas principal - Centre */}
        <div className="col-span-9">
            <CustomPdfCanvas
            template={template}
            currentPage={currentPage}
            zoomLevel={zoomLevel}
            selectedFieldId={selectedFieldId}
            sampleData={sampleData}
            onFieldSelect={setSelectedFieldId}
            onFieldMove={handleFieldMove}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomPdfTemplateEditor;