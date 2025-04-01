
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, X, Plus } from "lucide-react";

interface FormActionButtonsProps {
  editingId: string | null;
  handleSubmit: () => void;
  cancelEditing: () => void;
}

const FormActionButtons: React.FC<FormActionButtonsProps> = ({
  editingId,
  handleSubmit,
  cancelEditing
}) => {
  if (editingId) {
    return (
      <div className="flex gap-2">
        <Button 
          variant="default" 
          onClick={handleSubmit} 
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Edit className="h-4 w-4 mr-2" /> Mettre à jour
        </Button>
        <Button 
          variant="outline" 
          onClick={cancelEditing}
          className="flex-1"
        >
          <X className="h-4 w-4 mr-2" /> Annuler
        </Button>
      </div>
    );
  }
  
  return (
    <Button 
      variant="default" 
      onClick={handleSubmit}
      className="w-full bg-green-600 hover:bg-green-700"
    >
      <Plus className="h-4 w-4 mr-2" /> Ajouter à la liste
    </Button>
  );
};

export default FormActionButtons;
