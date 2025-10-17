import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { updateOfferDate, updateOfferRequestDate } from "@/services/offers/offerDetail";

interface OfferDateEditorProps {
  offerId: string;
  currentDate: string;
  isOpen: boolean;
  onClose: () => void;
  onDateUpdated: () => void;
  dateType?: 'created' | 'request';
}

export const OfferDateEditor: React.FC<OfferDateEditorProps> = ({
  offerId,
  currentDate,
  isOpen,
  onClose,
  onDateUpdated,
  dateType = 'request'
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(currentDate));
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const success = dateType === 'created' 
        ? await updateOfferDate(offerId, selectedDate.toISOString())
        : await updateOfferRequestDate(offerId, selectedDate.toISOString());
      
      if (success) {
        toast.success(dateType === 'created' ? "Date de création mise à jour" : "Date de demande mise à jour");
        onDateUpdated();
        onClose();
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Error updating offer date:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dateType === 'created' ? 'Modifier la date de création' : 'Modifier la date de demande'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={fr}
            className="rounded-md border pointer-events-auto"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Annuler
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? "Mise à jour..." : "Valider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
