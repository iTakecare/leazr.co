import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomPdfTemplateField } from '@/types/customPdfTemplateField';
import { cn } from '@/lib/utils';
import { Type, Heading1, Heading2, FileText, DollarSign, Calendar } from 'lucide-react';

interface StylePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  style: Partial<CustomPdfTemplateField['style']>;
  category: 'text' | 'title' | 'data' | 'accent';
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'title_large',
    name: 'Titre Principal',
    description: 'Grande police, gras',
    icon: Heading1,
    category: 'title',
    style: {
      fontSize: 20,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#1a1a1a',
      textAlign: 'left'
    }
  },
  {
    id: 'title_medium',
    name: 'Sous-titre',
    description: 'Police moyenne, gras',
    icon: Heading2,
    category: 'title',
    style: {
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#2a2a2a',
      textAlign: 'left'
    }
  },
  {
    id: 'body_text',
    name: 'Texte Courant',
    description: 'Police standard',
    icon: Type,
    category: 'text',
    style: {
      fontSize: 11,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      color: '#4a4a4a',
      textAlign: 'left'
    }
  },
  {
    id: 'amount_highlight',
    name: 'Montant Important',
    description: 'Mise en valeur financière',
    icon: DollarSign,
    category: 'accent',
    style: {
      fontSize: 18,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#16a34a',
      textAlign: 'right'
    }
  },
  {
    id: 'date_style',
    name: 'Date Standard',
    description: 'Format date classique',
    icon: Calendar,
    category: 'data',
    style: {
      fontSize: 10,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      color: '#6b7280',
      textAlign: 'left'
    }
  },
  {
    id: 'note_text',
    name: 'Note/Remarque',
    description: 'Texte d\'annotation',
    icon: FileText,
    category: 'text',
    style: {
      fontSize: 9,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      color: '#9ca3af',
      textAlign: 'left'
    }
  }
];

interface StylePresetsPanelProps {
  onApplyPreset: (style: Partial<CustomPdfTemplateField['style']>) => void;
  selectedFieldType?: CustomPdfTemplateField['type'];
  className?: string;
}

export const StylePresetsPanel: React.FC<StylePresetsPanelProps> = ({
  onApplyPreset,
  selectedFieldType,
  className
}) => {
  const categoryColors = {
    title: 'bg-blue-50 border-blue-200',
    text: 'bg-gray-50 border-gray-200',
    data: 'bg-green-50 border-green-200',
    accent: 'bg-orange-50 border-orange-200'
  };

  const categoryLabels = {
    title: 'Titres',
    text: 'Texte',
    data: 'Données',
    accent: 'Accent'
  };

  const groupedPresets = STYLE_PRESETS.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = [];
    }
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, StylePreset[]>);

  const renderPresetCard = (preset: StylePreset) => (
    <Card 
      key={preset.id}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md",
        categoryColors[preset.category]
      )}
      onClick={() => onApplyPreset(preset.style)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <preset.icon className="h-4 w-4" />
          <span className="font-medium text-sm">{preset.name}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {preset.description}
        </p>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Taille:</span>
            <span>{preset.style.fontSize}px</span>
          </div>
          <div className="flex justify-between">
            <span>Style:</span>
            <span>{preset.style.fontWeight}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Styles Prédéfinis</h3>
        {selectedFieldType && (
          <Badge variant="outline" className="text-xs">
            {selectedFieldType}
          </Badge>
        )}
      </div>
      
      {Object.entries(groupedPresets).map(([category, presets]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {presets.map(renderPresetCard)}
          </div>
        </div>
      ))}
    </div>
  );
};