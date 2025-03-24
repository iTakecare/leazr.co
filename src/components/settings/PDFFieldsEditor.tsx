
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "lucide-react";
import { PDFTemplate } from "@/utils/templateManager";

interface PDFFieldsEditorProps {
  template: PDFTemplate;
  onFieldsUpdate: (fields: any[]) => void;
}

const PDFFieldsEditor: React.FC<PDFFieldsEditorProps> = ({ template, onFieldsUpdate }) => {
  const [fields, setFields] = useState(template.fields || []);
  
  const addField = () => {
    const newField = {
      id: `field-${Date.now()}`,
      label: "New Field",
      type: "text",
      category: "client",
      isVisible: true,
      value: "",
      position: { x: 50, y: 50 },
      page: 0,
      style: {
        fontSize: 12,
        fontFamily: "Helvetica",
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        color: "#000000"
      }
    };
    
    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    onFieldsUpdate(updatedFields);
  };
  
  const removeField = (fieldId: string) => {
    const updatedFields = fields.filter(field => field.id !== fieldId);
    setFields(updatedFields);
    onFieldsUpdate(updatedFields);
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Fields Editor</h3>
          <Button onClick={addField} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
        
        {fields.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            No fields added yet. Click "Add Field" to start.
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border p-3 rounded-md relative">
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => removeField(field.id)}
                >
                  <Trash className="h-3 w-3" />
                </Button>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1">Label</Label>
                    <Input 
                      value={field.label} 
                      onChange={(e) => {
                        const updatedFields = [...fields];
                        updatedFields[index].label = e.target.value;
                        setFields(updatedFields);
                        onFieldsUpdate(updatedFields);
                      }} 
                    />
                  </div>
                  
                  <div>
                    <Label className="mb-1">Type</Label>
                    <Input 
                      value={field.type} 
                      disabled 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFFieldsEditor;
