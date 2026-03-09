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
  currentLeaserReference?: string | null;
  onUpdate?: () => void;
}

export const OfferReferenceEditor = ({
  offerId,
  currentReference,
  currentLeaserReference,
  onUpdate,
}: OfferReferenceEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reference, setReference] = useState(currentReference || "");
  const [leaserReference, setLeaserReference] = useState(currentLeaserReference || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!reference.trim()) {
      toast.error("Le numéro de référence ne peut pas être vide");
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateOffer(offerId, { 
        dossier_number: reference.trim(),
        leaser_request_number: leaserReference.trim() || null,
      });
      
      if (result) {
        toast.success("Références mises à jour avec succès");
        setIsOpen(false);
        onUpdate?.();
      } else {
        toast.error("Erreur lors de la mise à jour des références");
      }
    } catch (error) {
      console.error("Error updating references:", error);
      toast.error("Erreur lors de la mise à jour des références");
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
        title="Modifier les références"
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="text-xs">Éditer</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier les références</DialogTitle>
            <DialogDescription>
              Gérez le numéro de dossier interne et le numéro de demande du partenaire financier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="reference" className="text-sm font-medium">
                Numéro de dossier (interne)
              </label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: ITC-2025-OFF-001"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="leaserReference" className="text-sm font-medium">
                Numéro de demande leaseur
              </label>
              <Input
                id="leaserReference"
                value={leaserReference}
                onChange={(e) => setLeaserReference(e.target.value)}
                placeholder="Ex: BNP-REQ-2025-123"
              />
              <p className="text-xs text-muted-foreground">
                Référence attribuée par le partenaire financier (optionnel)
              </p>
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
