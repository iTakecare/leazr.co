import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateOffer } from "@/services/offers/offerDetail";

interface OfferReferenceEditorProps {
  offerId: string;
  currentReference: string | null;
  onUpdate?: () => void;
}

export const OfferReferenceEditor = ({
  offerId,
  currentReference,
  onUpdate,
}: OfferReferenceEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reference, setReference] = useState(currentReference || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!reference.trim()) {
      toast.error("Le numéro de référence ne peut pas être vide");
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateOffer(offerId, { dossier_number: reference.trim() });
      
      if (result) {
        toast.success("Référence mise à jour avec succès");
        setIsOpen(false);
        onUpdate?.();
      } else {
        toast.error("Erreur lors de la mise à jour de la référence");
      }
    } catch (error) {
      console.error("Error updating reference:", error);
      toast.error("Erreur lors de la mise à jour de la référence");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 gap-1.5 hover:bg-accent"
        title="Modifier la référence"
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="text-xs">Éditer</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le numéro de référence</DialogTitle>
            <DialogDescription>
              Saisissez le numéro de référence du partenaire financier pour cette offre.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="reference" className="text-sm font-medium">
                Numéro de référence
              </label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: DOSS-2025-001"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
