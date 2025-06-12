
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
          className="flex-1"
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
      variant="success" 
      onClick={handleSubmit}
      className="w-full"
    >
      <Plus className="h-4 w-4 mr-2" /> Ajouter à la liste
    </Button>
  );
};

export default FormActionButtons;
