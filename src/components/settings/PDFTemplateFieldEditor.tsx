
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash } from 'lucide-react';
import { TemplateField } from '@/utils/templateManager';

interface PDFTemplateFieldEditorProps {
  field: TemplateField;
  onUpdate: (field: TemplateField) => void;
  onDelete: () => void;
}

const PDFTemplateFieldEditor: React.FC<PDFTemplateFieldEditorProps> = ({
  field,
  onUpdate,
  onDelete
}) => {
  const handleUpdateField = (property: string, value: any) => {
    onUpdate({
      ...field,
      [property]: value
    });
  };

  const handleUpdateStyle = (property: string, value: any) => {
    onUpdate({
      ...field,
      style: {
        ...field.style,
        [property]: value
      }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Edit Field: {field.label}</CardTitle>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash className="h-4 w-4 mr-1" /> Delete
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="field-label">Field Label</Label>
            <Input
              id="field-label"
              value={field.label}
              onChange={(e) => handleUpdateField('label', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="field-category">Category</Label>
            <Select
              value={field.category}
              onValueChange={(value) => handleUpdateField('category', value)}
            >
              <SelectTrigger id="field-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="font-size">Font Size</Label>
            <Input
              id="font-size"
              type="number"
              min={8}
              max={36}
              value={field.style?.fontSize || 12}
              onChange={(e) => handleUpdateStyle('fontSize', Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="font-color">Font Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                id="font-color"
                value={field.style?.color || '#000000'}
                onChange={(e) => handleUpdateStyle('color', e.target.value)}
                className="w-10 h-10 p-1"
              />
              <Input
                value={field.style?.color || '#000000'}
                onChange={(e) => handleUpdateStyle('color', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="field-x">X Position</Label>
            <Input
              id="field-x"
              type="number"
              value={field.position.x}
              onChange={(e) => handleUpdateField('position', { ...field.position, x: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="field-y">Y Position</Label>
            <Input
              id="field-y"
              type="number"
              value={field.position.y}
              onChange={(e) => handleUpdateField('position', { ...field.position, y: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="font-weight">Font Weight</Label>
            <Select
              value={field.style?.fontWeight || 'normal'}
              onValueChange={(value) => handleUpdateStyle('fontWeight', value)}
            >
              <SelectTrigger id="font-weight">
                <SelectValue placeholder="Weight" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="font-style">Font Style</Label>
            <Select
              value={field.style?.fontStyle || 'normal'}
              onValueChange={(value) => handleUpdateStyle('fontStyle', value)}
            >
              <SelectTrigger id="font-style">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="italic">Italic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="text-decoration">Decoration</Label>
            <Select
              value={field.style?.textDecoration || 'none'}
              onValueChange={(value) => handleUpdateStyle('textDecoration', value)}
            >
              <SelectTrigger id="text-decoration">
                <SelectValue placeholder="Decoration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="underline">Underline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFTemplateFieldEditor;
