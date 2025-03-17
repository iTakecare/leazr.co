
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PartnerForm from "@/components/crm/forms/PartnerForm";
import { PartnerFormValues } from "@/services/partnerService";

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {partner ? "Modifier le partenaire" : "Ajouter un partenaire"}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <PartnerForm
            initialData={partner}
            onSubmit={onSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PartnerModal;
