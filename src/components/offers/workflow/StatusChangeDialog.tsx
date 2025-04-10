
import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface StatusChangeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  currentStatus: string;
  newStatus: string;
  isUpdating: boolean;
  getStatusLabel: (id: string) => string;
}

const StatusChangeDialog: React.FC<StatusChangeDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  currentStatus,
  newStatus,
  isUpdating,
  getStatusLabel,
}) => {
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    await onConfirm(reason);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Changer le statut</AlertDialogTitle>
          <AlertDialogDescription>
            Vous êtes sur le point de changer le statut de l'offre de{" "}
            <strong>{getStatusLabel(currentStatus)}</strong> à{" "}
            <strong>{getStatusLabel(newStatus)}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label htmlFor="status-change-reason">Raison du changement (optionnel)</Label>
          <Textarea
            id="status-change-reason"
            placeholder="Veuillez indiquer la raison de ce changement de statut..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating} onClick={handleCancel}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isUpdating}
            className={newStatus === "rejected" ? "bg-red-500 hover:bg-red-600" : ""}
          >
            {isUpdating ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Mise à jour...
              </div>
            ) : (
              "Confirmer"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default StatusChangeDialog;
