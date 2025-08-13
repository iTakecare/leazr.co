
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommissionLevel, createCommissionLevel, updateCommissionLevel } from "@/services/commissionService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CommissionLevelFormProps {
  isOpen: boolean;
  onClose: () => void;
  level: CommissionLevel | null;
  type: 'ambassador' | 'partner';
  onSave: (data: Partial<CommissionLevel>) => void; // Updated the type to match how it's called
}

const CommissionLevelForm: React.FC<CommissionLevelFormProps> = ({
  isOpen,
  onClose,
  level,
  type,
  onSave,
}) => {
  const [name, setName] = useState(level?.name || '');
  const [isDefault, setIsDefault] = useState(level?.is_default || false);
  const [calculationMode, setCalculationMode] = useState<'margin' | 'purchase_price'>(level?.calculation_mode || 'margin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(level);

  const resetForm = () => {
    setName(level?.name || '');
    setIsDefault(level?.is_default || false);
    setCalculationMode(level?.calculation_mode || 'margin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom du barème est requis");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && level) {
        await updateCommissionLevel(level.id, {
          name,
          is_default: isDefault,
          calculation_mode: calculationMode
        });
        toast.success("Barème mis à jour avec succès");
      } else {
        await createCommissionLevel({
          name,
          type,
          is_default: isDefault,
          calculation_mode: calculationMode
        });
        toast.success("Barème créé avec succès");
      }
      
      // Call onSave with the form data
      onSave({ 
        name, 
        is_default: isDefault,
        calculation_mode: calculationMode,
        type
      });
    } catch (error) {
      console.error("Error saving commission level:", error);
      toast.error("Erreur lors de l'enregistrement du barème");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le barème" : "Nouveau barème"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du barème</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Entrez le nom du barème"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="calculationMode">Mode de calcul</Label>
              <Select value={calculationMode} onValueChange={(value: 'margin' | 'purchase_price') => setCalculationMode(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le mode de calcul" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="margin">% sur marge</SelectItem>
                  <SelectItem value="purchase_price">% sur prix d'achat</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                {calculationMode === 'margin' 
                  ? 'Commission calculée en pourcentage de la marge générée'
                  : 'Commission calculée en pourcentage du prix d\'achat total HTVA'
                }
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault">Barème par défaut</Label>
              <Switch
                id="isDefault"
                checked={isDefault}
                onCheckedChange={setIsDefault}
                disabled={level?.is_default}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {type === 'ambassador' ? 'Ce barème sera appliqué aux nouveaux ambassadeurs' : 'Ce barème sera appliqué aux nouveaux partenaires'} si défini par défaut.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                isEditing ? "Mettre à jour" : "Créer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommissionLevelForm;
