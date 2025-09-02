import React, { useState } from "react";
import { Collaborator } from "@/types/client";
import { updateCollaborator } from "@/services/clientService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditCollaboratorModalProps {
  collaborator: Collaborator | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const EditCollaboratorModal: React.FC<EditCollaboratorModalProps> = ({
  collaborator,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: collaborator?.name || "",
    role: collaborator?.role || "",
    email: collaborator?.email || "",
    phone: collaborator?.phone || "",
    department: collaborator?.department || ""
  });
  const [isLoading, setIsLoading] = useState(false);

  // Update form data when collaborator changes
  React.useEffect(() => {
    if (collaborator) {
      setFormData({
        name: collaborator.name || "",
        role: collaborator.role || "",
        email: collaborator.email || "",
        phone: collaborator.phone || "",
        department: collaborator.department || ""
      });
    }
  }, [collaborator]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaborator) return;

    if (!formData.name.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    setIsLoading(true);
    try {
      await updateCollaborator(collaborator.id, formData);
      toast.success("Collaborateur mis à jour avec succès");
      onSave();
      onClose();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du collaborateur");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le collaborateur</DialogTitle>
          <DialogDescription>
            Modifiez les informations du collaborateur. Cliquez sur sauvegarder pour confirmer les changements.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Nom du collaborateur"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange("role", e.target.value)}
              placeholder="Rôle ou fonction"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="email@exemple.com"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="+33 1 23 45 67 89"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="department">Département</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => handleInputChange("department", e.target.value)}
              placeholder="Département ou service"
              disabled={isLoading}
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCollaboratorModal;