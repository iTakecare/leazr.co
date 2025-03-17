
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommissionRate, createCommissionRate, updateCommissionRate } from "@/services/commissionService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CommissionRateFormProps {
  isOpen: boolean;
  onClose: () => void;
  levelId: string;
  rate: CommissionRate | null;
  onSave: () => void;
}

const CommissionRateForm: React.FC<CommissionRateFormProps> = ({
  isOpen,
  onClose,
  levelId,
  rate,
  onSave
}) => {
  const [minAmount, setMinAmount] = useState(rate?.min_amount.toString() || '');
  const [maxAmount, setMaxAmount] = useState(rate?.max_amount.toString() || '');
  const [ratePercent, setRatePercent] = useState(rate?.rate.toString() || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(rate);

  const resetForm = () => {
    setMinAmount(rate?.min_amount.toString() || '');
    setMaxAmount(rate?.max_amount.toString() || '');
    setRatePercent(rate?.rate.toString() || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!minAmount || !maxAmount || !ratePercent) {
      toast.error("Tous les champs sont requis");
      return;
    }

    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    const rateValue = parseFloat(ratePercent);

    if (isNaN(min) || isNaN(max) || isNaN(rateValue)) {
      toast.error("Veuillez entrer des valeurs numériques valides");
      return;
    }

    if (min >= max) {
      toast.error("Le montant minimum doit être inférieur au montant maximum");
      return;
    }

    if (rateValue <= 0 || rateValue > 100) {
      toast.error("Le taux doit être compris entre 0 et 100%");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && rate) {
        await updateCommissionRate(rate.id, {
          min_amount: min,
          max_amount: max,
          rate: rateValue
        });
        toast.success("Taux mis à jour avec succès");
      } else {
        await createCommissionRate({
          level_id: levelId,
          min_amount: min,
          max_amount: max,
          rate: rateValue
        });
        toast.success("Taux créé avec succès");
      }
      onSave();
    } catch (error) {
      console.error("Error saving commission rate:", error);
      toast.error("Erreur lors de l'enregistrement du taux");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNumberInput = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    // Allow empty string for new inputs
    if (value === '') {
      setter('');
      return;
    }
    
    // Replace commas with dots for decimal
    let formattedValue = value.replace(',', '.');
    
    // Only allow numbers and a single decimal point
    formattedValue = formattedValue.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = formattedValue.split('.');
    if (parts.length > 2) {
      formattedValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    setter(formattedValue);
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
            {isEditing ? "Modifier la tranche" : "Nouvelle tranche"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="minAmount">Montant minimum (€)</Label>
              <Input
                id="minAmount"
                value={minAmount}
                onChange={(e) => formatNumberInput(e.target.value, setMinAmount)}
                placeholder="Ex: 500"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxAmount">Montant maximum (€)</Label>
              <Input
                id="maxAmount"
                value={maxAmount}
                onChange={(e) => formatNumberInput(e.target.value, setMaxAmount)}
                placeholder="Ex: 2500"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rate">Taux de commission (%)</Label>
              <Input
                id="rate"
                value={ratePercent}
                onChange={(e) => formatNumberInput(e.target.value, setRatePercent)}
                placeholder="Ex: 10"
                required
              />
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

export default CommissionRateForm;
