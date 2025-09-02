import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collaborator } from "@/types/client";
import { updateCollaborator } from "@/services/clientService";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface InlineCollaboratorEditProps {
  collaborator: Collaborator;
  onSave: () => void;
  onCancel: () => void;
}

const InlineCollaboratorEdit: React.FC<InlineCollaboratorEditProps> = ({
  collaborator,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: collaborator.name || "",
    role: collaborator.role || "",
    email: collaborator.email || "",
    phone: collaborator.phone || "",
    department: collaborator.department || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.role.trim()) {
      toast.error("Le nom et le rôle sont obligatoires");
      return;
    }

    setSaving(true);
    try {
      await updateCollaborator(collaborator.id, formData);
      toast.success("Collaborateur mis à jour avec succès");
      onSave();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Nom *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Nom complet"
          />
        </div>
        
        <div>
          <Label htmlFor="role" className="text-sm font-medium">
            Fonction *
          </Label>
          <Input
            id="role"
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
            placeholder="Fonction"
          />
        </div>
        
        <div>
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="email@exemple.com"
          />
        </div>
        
        <div>
          <Label htmlFor="phone" className="text-sm font-medium">
            Téléphone
          </Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+32 2 123 45 67"
          />
        </div>
        
        <div className="md:col-span-2">
          <Label htmlFor="department" className="text-sm font-medium">
            Département
          </Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            placeholder="Département"
          />
        </div>
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          <X className="h-4 w-4 mr-1" />
          Annuler
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          <Check className="h-4 w-4 mr-1" />
          {saving ? "Sauvegarde..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
};

export default InlineCollaboratorEdit;