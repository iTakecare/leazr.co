import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { PDF_TEMPLATES } from './templates';

interface PdfTemplateSelectorProps {
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
}

export const PdfTemplateSelector: React.FC<PdfTemplateSelectorProps> = ({
  selectedTemplateId,
  onSelectTemplate,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choisissez un template</h3>
        <p className="text-sm text-muted-foreground">
          Sélectionnez le design qui correspond le mieux à votre image de marque
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(PDF_TEMPLATES).map((template) => (
          <Card
            key={template.id}
            className={`relative cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplateId === template.id
                ? 'ring-2 ring-primary shadow-lg'
                : 'hover:ring-1 hover:ring-muted-foreground/20'
            }`}
            onClick={() => onSelectTemplate(template.id)}
          >
            <div className="p-6">
              {/* Thumbnail */}
              <div className="flex items-center justify-center h-32 mb-4 bg-muted rounded-md">
                <span className="text-6xl">{template.thumbnail}</span>
              </div>

              {/* Template Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{template.name}</h4>
                  {selectedTemplateId === template.id && (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              </div>

              {/* Select Button */}
              <Button
                variant={selectedTemplateId === template.id ? 'default' : 'outline'}
                className="w-full mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTemplate(template.id);
                }}
              >
                {selectedTemplateId === template.id ? 'Sélectionné' : 'Sélectionner'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
