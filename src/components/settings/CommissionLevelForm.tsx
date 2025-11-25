
import React, { useState, useEffect } from "react";
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
  const [calculationMode, setCalculationMode] = useState<'margin' | 'purchase_price' | 'monthly_payment' | 'one_monthly_rounded_up'>(level?.calculation_mode || 'margin');
  const [fixedRate, setFixedRate] = useState<number>(level?.fixed_rate || 100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(level);

  // Synchroniser les états quand la prop level change
  useEffect(() => {
    setName(level?.name || '');
    setIsDefault(level?.is_default || false);
    setCalculationMode(level?.calculation_mode || 'margin');
    setFixedRate(level?.fixed_rate || 100);
  }, [level]);

  const resetForm = () => {
    setName(level?.name || '');
    setIsDefault(level?.is_default || false);
    setCalculationMode(level?.calculation_mode || 'margin');
    setFixedRate(level?.fixed_rate || 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom du barème est requis");
      return;
    }

    // Validation pour le mode monthly_payment
    if (calculationMode === 'monthly_payment' && (!fixedRate || fixedRate <= 0)) {
      toast.error("Le taux de commission est requis pour le mode mensualité");
      return;
    }
    
    // Pour le mode one_monthly_rounded_up, pas besoin de taux (toujours 100%)

    setIsSubmitting(true);
    try {
      console.log("[CommissionLevelForm] Submitting form with data:", { name, type, isDefault, calculationMode, fixedRate });
      
      let result;
      if (isEditing && level) {
        result = await updateCommissionLevel(level.id, {
          name,
          is_default: isDefault,
          calculation_mode: calculationMode,
          fixed_rate: calculationMode === 'monthly_payment' ? fixedRate : undefined
        });
        console.log("[CommissionLevelForm] Update result:", result);
        toast.success("Barème mis à jour avec succès");
      } else {
        result = await createCommissionLevel({
          name,
          type,
          is_default: isDefault,
          calculation_mode: calculationMode,
          fixed_rate: calculationMode === 'monthly_payment' ? fixedRate : undefined
        });
        console.log("[CommissionLevelForm] Create result:", result);
        toast.success("Barème créé avec succès");
      }
      
      // Call onSave with the form data only if successful
      if (result) {
        onSave({ 
          name, 
          is_default: isDefault,
          calculation_mode: calculationMode,
          fixed_rate: calculationMode === 'monthly_payment' ? fixedRate : undefined,
          type
        });
      } else {
        toast.error("Erreur: Aucune donnée retournée");
      }
    } catch (error) {
      console.error("[CommissionLevelForm] Error saving commission level:", error);
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
              <Select value={calculationMode} onValueChange={(value: 'margin' | 'purchase_price' | 'monthly_payment' | 'one_monthly_rounded_up') => setCalculationMode(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le mode de calcul" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="margin">% sur marge</SelectItem>
                  <SelectItem value="purchase_price">% sur prix d'achat</SelectItem>
                  <SelectItem value="monthly_payment">% sur mensualité client</SelectItem>
                  <SelectItem value="one_monthly_rounded_up">1 mensualité (arrondi à l'euro supérieur)</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                {calculationMode === 'margin' 
                  ? 'Commission calculée en pourcentage de la marge générée'
                  : calculationMode === 'purchase_price'
                  ? 'Commission calculée en pourcentage du prix d\'achat total HTVA'
                  : calculationMode === 'monthly_payment'
                  ? 'Commission calculée en pourcentage de la mensualité totale du client'
                  : 'L\'ambassadeur touche 1 mensualité complète, arrondie à l\'euro supérieur. Ex: 92,30€ → 93€'
                }
              </div>
            </div>
            {calculationMode === 'monthly_payment' && (
              <div className="grid gap-2">
                <Label htmlFor="fixedRate">Taux de commission (%)</Label>
                <Input
                  id="fixedRate"
                  type="number"
                  value={fixedRate}
                  onChange={(e) => setFixedRate(Number(e.target.value))}
                  placeholder="Ex: 100 pour 100%"
                  min="0"
                  step="0.01"
                  required
                />
                <div className="text-sm text-muted-foreground">
                  Exemple : Si vous saisissez 100%, l'ambassadeur recevra 100% de la mensualité en commission
                </div>
              </div>
            )}
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
