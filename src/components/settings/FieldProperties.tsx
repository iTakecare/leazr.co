
import React from 'react';
import { PDFField } from '@/types/pdf';
import { Bold, Italic, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface FieldPropertiesProps {
  field: PDFField;
  onFieldStyleUpdate: (fieldId: string, newStyle: any) => void;
}

const FieldProperties: React.FC<FieldPropertiesProps> = ({ field, onFieldStyleUpdate }) => {
  // Handle font size change
  const handleFontSizeChange = (size: number) => {
    onFieldStyleUpdate(field.id, { fontSize: size });
  };
  
  // Toggle font weight (bold)
  const toggleFontWeight = () => {
    const newWeight = field.style?.fontWeight === 'bold' ? 'normal' : 'bold';
    onFieldStyleUpdate(field.id, { fontWeight: newWeight });
  };
  
  // Toggle font style (italic)
  const toggleFontStyle = () => {
    const newStyle = field.style?.fontStyle === 'italic' ? 'normal' : 'italic';
    onFieldStyleUpdate(field.id, { fontStyle: newStyle });
  };
  
  // Toggle text decoration (underline)
  const toggleTextDecoration = () => {
    const newDecoration = field.style?.textDecoration === 'underline' ? 'none' : 'underline';
    onFieldStyleUpdate(field.id, { textDecoration: newDecoration });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Champ sélectionné</Label>
        <div className="p-2 bg-gray-100 rounded-md mt-1">
          <p className="font-medium">{field.label}</p>
          <p className="text-xs text-gray-500">{field.id}</p>
        </div>
      </div>
      
      <Separator />
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Taille de police</Label>
          <span className="text-xs font-medium">{field.style?.fontSize || 10}pt</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs">6</span>
          <Slider
            value={[field.style?.fontSize || 10]}
            min={6}
            max={36}
            step={1}
            onValueChange={(value) => handleFontSizeChange(value[0])}
            className="flex-1"
          />
          <span className="text-xs">36</span>
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">Style de texte</Label>
        <div className="flex space-x-2">
          <Button
            variant={field.style?.fontWeight === 'bold' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleFontWeight}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={field.style?.fontStyle === 'italic' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleFontStyle}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant={field.style?.textDecoration === 'underline' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleTextDecoration}
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Separator />
      
      <div>
        <Label className="mb-2 block">Dimensions</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs mb-1 block">Largeur</Label>
            <Input
              type="number"
              value={field.style?.width || 100}
              onChange={(e) => {
                const width = parseFloat(e.target.value) || 100;
                onFieldStyleUpdate(field.id, { width });
              }}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Hauteur</Label>
            <Input
              type="number"
              value={field.style?.height || 30}
              onChange={(e) => {
                const height = parseFloat(e.target.value) || 30;
                onFieldStyleUpdate(field.id, { height });
              }}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Vous pouvez aussi redimensionner le champ directement en tirant sur le coin inférieur droit
        </p>
      </div>
      
      <Separator />
      
      <div>
        <Label className="mb-2 block">Valeur</Label>
        <Input
          value={field.value}
          disabled
          className="bg-gray-50"
        />
        <p className="text-xs text-gray-500 mt-1">
          Pour modifier la valeur, utilisez l'onglet "Liste des champs"
        </p>
      </div>
    </div>
  );
};

export default FieldProperties;
