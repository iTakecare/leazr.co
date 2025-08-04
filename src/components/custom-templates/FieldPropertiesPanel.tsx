import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Settings } from "lucide-react";
import { CustomPdfTemplateField } from "@/types/customPdfTemplateField";
import { cn } from "@/lib/utils";

interface FieldPropertiesPanelProps {
  field: CustomPdfTemplateField | null;
  onFieldUpdate: (fieldId: string, updates: Partial<CustomPdfTemplateField>) => void;
  onFieldDelete: (fieldId: string) => void;
  className?: string;
}

const FieldPropertiesPanel: React.FC<FieldPropertiesPanelProps> = ({
  field,
  onFieldUpdate,
  onFieldDelete,
  className
}) => {
  if (!field) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Propriétés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Sélectionnez un champ pour modifier ses propriétés
          </p>
        </CardContent>
      </Card>
    );
  }

  const updateField = (updates: Partial<CustomPdfTemplateField>) => {
    onFieldUpdate(field.id, updates);
  };

  const updatePosition = (axis: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateField({
        position: {
          ...field.position,
          [axis]: Math.max(0, numValue)
        }
      });
    }
  };

  const updateStyle = (styleKey: keyof CustomPdfTemplateField['style'], value: any) => {
    updateField({
      style: {
        ...field.style,
        [styleKey]: value
      }
    });
  };

  const updateFormat = (formatKey: string, value: any) => {
    updateField({
      format: {
        ...field.format,
        [formatKey]: value
      }
    });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Propriétés
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onFieldDelete(field.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Informations générales */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Général</h4>
          
          <div className="space-y-2">
            <Label htmlFor="field-label">Libellé</Label>
            <Input
              id="field-label"
              value={field.label}
              onChange={(e) => updateField({ label: e.target.value })}
              placeholder="Nom du champ"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="field-mapping">Clé de mapping</Label>
            <Input
              id="field-mapping"
              value={field.mapping_key}
              onChange={(e) => updateField({ mapping_key: e.target.value })}
              placeholder="ex: client.name"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="field-visible"
              checked={field.isVisible}
              onCheckedChange={(checked) => updateField({ isVisible: checked })}
            />
            <Label htmlFor="field-visible">Visible</Label>
          </div>
        </div>

        {/* Position */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Position (mm)</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="field-x">X</Label>
              <Input
                id="field-x"
                type="number"
                value={field.position.x}
                onChange={(e) => updatePosition('x', e.target.value)}
                step="0.1"
                min="0"
                max="210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-y">Y</Label>
              <Input
                id="field-y"
                type="number"
                value={field.position.y}
                onChange={(e) => updatePosition('y', e.target.value)}
                step="0.1"
                min="0"
                max="297"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="field-page">Page</Label>
            <Input
              id="field-page"
              type="number"
              value={field.position.page}
              onChange={(e) => updateField({
                position: { ...field.position, page: parseInt(e.target.value) || 1 }
              })}
              min="1"
            />
          </div>
        </div>

        {/* Style */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Style</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="field-font-size">Taille</Label>
              <Input
                id="field-font-size"
                type="number"
                value={field.style.fontSize}
                onChange={(e) => updateStyle('fontSize', parseInt(e.target.value) || 12)}
                min="6"
                max="72"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-color">Couleur</Label>
              <Input
                id="field-color"
                type="color"
                value={field.style.color}
                onChange={(e) => updateStyle('color', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="field-font-family">Police</Label>
            <Select
              value={field.style.fontFamily}
              onValueChange={(value) => updateStyle('fontFamily', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="field-weight">Poids</Label>
              <Select
                value={field.style.fontWeight}
                onValueChange={(value) => updateStyle('fontWeight', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Gras</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-align">Alignement</Label>
              <Select
                value={field.style.textAlign}
                onValueChange={(value) => updateStyle('textAlign', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Gauche</SelectItem>
                  <SelectItem value="center">Centre</SelectItem>
                  <SelectItem value="right">Droite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(field.type === 'table' || field.style.width || field.style.height) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="field-width">Largeur (mm)</Label>
                <Input
                  id="field-width"
                  type="number"
                  value={field.style.width || ''}
                  onChange={(e) => updateStyle('width', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Auto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-height">Hauteur (mm)</Label>
                <Input
                  id="field-height"
                  type="number"
                  value={field.style.height || ''}
                  onChange={(e) => updateStyle('height', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Auto"
                />
              </div>
            </div>
          )}
        </div>

        {/* Format spécifique selon le type */}
        {(field.type === 'currency' || field.type === 'date' || field.type === 'number') && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Format</h4>
            
            {field.type === 'currency' && (
              <div className="space-y-2">
                <Label htmlFor="field-currency">Devise</Label>
                <Select
                  value={field.format?.currency || 'EUR'}
                  onValueChange={(value) => updateFormat('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                    <SelectItem value="USD">Dollar ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {field.type === 'date' && (
              <div className="space-y-2">
                <Label htmlFor="field-date-format">Format de date</Label>
                <Select
                  value={field.format?.dateFormat || 'dd/MM/yyyy'}
                  onValueChange={(value) => updateFormat('dateFormat', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                    <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                    <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {field.type === 'number' && (
              <div className="space-y-2">
                <Label htmlFor="field-decimals">Décimales</Label>
                <Input
                  id="field-decimals"
                  type="number"
                  value={field.format?.numberDecimals || 0}
                  onChange={(e) => updateFormat('numberDecimals', parseInt(e.target.value) || 0)}
                  min="0"
                  max="5"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FieldPropertiesPanel;