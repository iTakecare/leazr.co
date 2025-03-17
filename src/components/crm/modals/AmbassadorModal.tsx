
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AmbassadorForm from "@/components/crm/forms/AmbassadorForm";
import { AmbassadorFormValues } from "@/services/ambassadorService";
import { getCommissionLevels, CommissionLevel } from "@/services/commissionService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BadgePercent } from "lucide-react";
import { toast } from "sonner";

interface AmbassadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  ambassador?: AmbassadorFormValues;
  onSubmit: (data: AmbassadorFormValues) => void;
  isSubmitting?: boolean;
}

const AmbassadorModal: React.FC<AmbassadorModalProps> = ({
  isOpen,
  onClose,
  ambassador,
  onSubmit,
  isSubmitting = false,
}) => {
  const [commissionLevels, setCommissionLevels] = useState<CommissionLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>(ambassador?.commission_level_id || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCommissionLevels();
    }
  }, [isOpen]);

  useEffect(() => {
    if (ambassador) {
      setSelectedLevel(ambassador.commission_level_id || "");
    } else {
      setSelectedLevel("");
    }
  }, [ambassador]);

  const loadCommissionLevels = async () => {
    setLoading(true);
    try {
      const levels = await getCommissionLevels('ambassador');
      setCommissionLevels(levels);
      
      // If creating a new ambassador and no level is selected yet, select the default one
      if (!ambassador && !selectedLevel) {
        const defaultLevel = levels.find(l => l.is_default);
        if (defaultLevel) {
          setSelectedLevel(defaultLevel.id);
        }
      }
    } catch (error) {
      console.error("Error loading commission levels:", error);
      toast.error("Erreur lors du chargement des barèmes de commission");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (data: AmbassadorFormValues) => {
    // Add the selected commission level to the form data
    onSubmit({
      ...data,
      commission_level_id: selectedLevel
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ambassador ? "Modifier l'ambassadeur" : "Ajouter un ambassadeur"}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <BadgePercent className="h-5 w-5 text-primary" />
              <Label>Barème de commissionnement</Label>
            </div>
            <Select
              value={selectedLevel}
              onValueChange={setSelectedLevel}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un barème" />
              </SelectTrigger>
              <SelectContent>
                {commissionLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.name}{level.is_default ? " (Par défaut)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Separator className="my-4" />
          
          <AmbassadorForm
            initialData={ambassador}
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AmbassadorModal;
