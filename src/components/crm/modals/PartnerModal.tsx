
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import PartnerForm, { PartnerFormValues } from "../forms/PartnerForm";

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PartnerFormValues) => void;
  partner?: PartnerFormValues & { id?: string };
  isSubmitting?: boolean;
}

const PartnerModal = ({
  isOpen,
  onClose,
  onSubmit,
  partner,
  isSubmitting = false,
}: PartnerModalProps) => {
  const title = partner?.id ? "Modifier le partenaire" : "Ajouter un partenaire";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {partner?.id 
              ? "Modifiez les informations du partenaire ci-dessous"
              : "Remplissez le formulaire pour ajouter un nouveau partenaire"
            }
          </DialogDescription>
        </DialogHeader>
        <PartnerForm
          initialData={partner}
          onSubmit={onSubmit}
          onCancel={onClose}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PartnerModal;
