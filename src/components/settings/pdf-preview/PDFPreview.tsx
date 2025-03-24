
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { PDFTemplate } from '@/utils/templateManager';

interface PDFPreviewProps {
  template: PDFTemplate;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ template }) => {
  const hasImages = template.templateImages && template.templateImages.length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>PDF Preview</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasImages ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucune image de modèle n'a été ajoutée. Veuillez ajouter des images de modèle dans l'onglet "Conception du modèle".
            </AlertDescription>
          </Alert>
        ) : (
          <div className="border rounded-md p-4 bg-gray-50 flex justify-center">
            <div 
              className="border shadow-md rounded bg-white" 
              style={{ 
                width: '210mm', 
                height: '297mm', 
                position: 'relative',
                transform: 'scale(0.4)',
                transformOrigin: 'top center'
              }}
            >
              {/* Preview of the first page */}
              {template.templateImages[0] && (
                <img 
                  src={template.templateImages[0].data} 
                  alt="Page 1" 
                  style={{ width: '100%', height: '100%', position: 'absolute' }}
                />
              )}
              
              {/* Render fields */}
              {template.fields.map(field => (
                field.page === 0 && field.isVisible && (
                  <div 
                    key={field.id}
                    style={{
                      position: 'absolute',
                      left: `${field.position.x}mm`,
                      top: `${field.position.y}mm`,
                      fontSize: `${field.style?.fontSize || 12}px`,
                      fontWeight: field.style?.fontWeight || 'normal',
                      fontStyle: field.style?.fontStyle || 'normal',
                      textDecoration: field.style?.textDecoration || 'none',
                      color: field.style?.color || '#000000'
                    }}
                  >
                    {field.label}
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFPreview;
