
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PartnerForm from "@/components/crm/forms/PartnerForm";
import { PartnerFormValues } from "@/services/partnerService";
import { getCommissionLevels, CommissionLevel } from "@/services/commissionService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BadgePercent } from "lucide-react";
import { toast } from "sonner";

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner?: PartnerFormValues;
  onSubmit: (data: PartnerFormValues) => void;
  isSubmitting?: boolean;
}

const PartnerModal: React.FC<PartnerModalProps> = ({
  isOpen,
  onClose,
  partner,
  onSubmit,
  isSubmitting = false,
}) => {
  const [commissionLevels, setCommissionLevels] = useState<CommissionLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>(partner?.commission_level_id || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCommissionLevels();
    }
  }, [isOpen]);

  useEffect(() => {
    if (partner) {
      setSelectedLevel(partner.commission_level_id || "");
    } else {
      setSelectedLevel("");
    }
  }, [partner]);

  const loadCommissionLevels = async () => {
    setLoading(true);
    try {
      const levels = await getCommissionLevels('partner');
      setCommissionLevels(levels);
      
      // If creating a new partner and no level is selected yet, select the default one
      if (!partner && !selectedLevel) {
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

  const handleFormSubmit = (data: PartnerFormValues) => {
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
            {partner ? "Modifier le partenaire" : "Ajouter un partenaire"}
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
          
          <PartnerForm
            initialData={partner}
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PartnerModal;
