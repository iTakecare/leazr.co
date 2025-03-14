
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AmbassadorForm, { AmbassadorFormValues } from "../forms/AmbassadorForm";

interface AmbassadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AmbassadorFormValues) => void;
  ambassador?: AmbassadorFormValues & { id?: string };
  isSubmitting?: boolean;
}

const AmbassadorModal = ({
  isOpen,
  onClose,
  onSubmit,
  ambassador,
  isSubmitting = false,
}: AmbassadorModalProps) => {
  const title = ambassador?.id ? "Modifier l'ambassadeur" : "Ajouter un ambassadeur";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <AmbassadorForm
          initialData={ambassador}
          onSubmit={onSubmit}
          onCancel={onClose}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AmbassadorModal;
