
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PDFTemplate, TemplateField } from "@/utils/templateManager";

interface PDFFieldsEditorProps {
  fields: TemplateField[];
  onChange: (fields: TemplateField[]) => void;
  activePage: number;
  onPageChange: (page: number) => void;
  template: PDFTemplate;
  onDeleteField: (fieldId: string) => void;
  onAddField: (field: TemplateField) => void;
  onDuplicateField: (fieldId: string, targetPage: number) => void;
  onRemoveFieldFromPage: (fieldId: string, page: number) => void;
}

const PDFFieldsEditor: React.FC<PDFFieldsEditorProps> = ({
  fields,
  onChange,
  activePage,
  template,
  onDeleteField
}) => {
  // Filter fields for active page
  const fieldsForPage = fields.filter(field => field.page === activePage);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Champs sur la page {activePage + 1}</h3>
      </div>
      
      {fieldsForPage.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground">Aucun champ sur cette page</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fieldsForPage.map(field => (
            <Card key={field.id} className="p-4">
              <div className="flex justify-between">
                <div className="font-medium">{field.label}</div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDeleteField(field.id)}
                >
                  Supprimer
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Position: {field.position.x}, {field.position.y}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PDFFieldsEditor;
