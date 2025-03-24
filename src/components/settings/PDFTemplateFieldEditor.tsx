
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TemplateField } from "@/utils/templateManager";
import { Plus } from "lucide-react";

interface PDFTemplateFieldEditorProps {
  templateFields: TemplateField[];
  onChange: (fields: TemplateField[]) => void;
  selectedPage: number;
}

const PDFTemplateFieldEditor: React.FC<PDFTemplateFieldEditorProps> = ({
  templateFields,
  onChange,
  selectedPage
}) => {
  // Filter fields for the selected page
  const fieldsForPage = templateFields.filter(field => field.page === selectedPage);

  // Add a placeholder field for testing
  const addPlaceholderField = () => {
    const newField: TemplateField = {
      id: `field-${Date.now()}`,
      label: `Field ${templateFields.length + 1}`,
      type: "text",
      category: "client",
      isVisible: true,
      value: "Sample value",
      position: { x: 100, y: 100 },
      page: selectedPage,
      style: {
        fontSize: 12,
        fontFamily: "Helvetica",
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        color: "#000000"
      }
    };

    onChange([...templateFields, newField]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">
          Champs sur la page {selectedPage + 1} ({fieldsForPage.length})
        </h3>
        <Button size="sm" onClick={addPlaceholderField}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un champ
        </Button>
      </div>

      {fieldsForPage.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun champ sur cette page. Cliquez sur "Ajouter un champ" pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {fieldsForPage.map(field => (
            <Card key={field.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="font-medium">{field.label}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Position: {field.position.x}, {field.position.y}
                </div>
                <div className="text-sm mt-2">{field.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PDFTemplateFieldEditor;
