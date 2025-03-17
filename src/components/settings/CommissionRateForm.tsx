
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommissionRate } from "@/services/commissionService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CommissionRateFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSave: (data: Partial<CommissionRate>) => void;
  rate?: CommissionRate | null;
  levelId?: string;
  // Ces props sont exigées par CommissionManager
  onSubmit?: (data: any) => Promise<void>;
  onCancel?: () => void;
  initialData?: { min_amount: number; max_amount: number; rate: number };
  inline?: boolean;
}

const CommissionRateForm: React.FC<CommissionRateFormProps> = ({
  isOpen = false,
  onClose = () => {},
  onSave,
  rate,
  levelId,
  initialData,
  inline = false
}) => {
  const [minAmount, setMinAmount] = useState(initialData?.min_amount || rate?.min_amount || 0);
  const [maxAmount, setMaxAmount] = useState(initialData?.max_amount || rate?.max_amount || 0);
  const [rateValue, setRateValue] = useState(initialData?.rate || rate?.rate || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (minAmount >= maxAmount) {
      toast.error("Le montant minimum doit être inférieur au montant maximum");
      return;
    }

    if (rateValue <= 0 || rateValue > 100) {
      toast.error("Le taux doit être compris entre 0 et 100%");
      return;
    }

    const data = {
      min_amount: Number(minAmount),
      max_amount: Number(maxAmount),
      rate: Number(rateValue),
      level_id: levelId || rate?.level_id
    };

    setIsSubmitting(true);
    
    try {
      onSave(data);
      if (!inline) {
        onClose();
      }
    } catch (error) {
      console.error("Error submitting rate form:", error);
      toast.error("Erreur lors de l'enregistrement du taux");
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className={inline ? "space-y-3" : "grid gap-4 py-4"}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="minAmount">Montant min (€)</Label>
          <Input
            id="minAmount"
            type="number"
            step="0.01"
            value={minAmount}
            onChange={(e) => setMinAmount(parseFloat(e.target.value) || 0)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxAmount">Montant max (€)</Label>
          <Input
            id="maxAmount"
            type="number"
            step="0.01"
            value={maxAmount}
            onChange={(e) => setMaxAmount(parseFloat(e.target.value) || 0)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rate">Taux (%)</Label>
        <Input
          id="rate"
          type="number"
          step="0.1"
          value={rateValue}
          onChange={(e) => setRateValue(parseFloat(e.target.value) || 0)}
          required
        />
      </div>

      {inline ? (
        <div className="flex justify-end space-x-2">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
          </Button>
        </div>
      ) : null}
    </form>
  );

  if (inline) {
    return content;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {rate ? "Modifier le taux" : "Nouveau taux"}
          </DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {rate ? "Mise à jour..." : "Création..."}
              </>
            ) : (
              rate ? "Mettre à jour" : "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CommissionRateForm;
