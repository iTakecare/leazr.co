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
import { supabase } from "@/integrations/supabase/client";

interface ContractReferenceEditorProps {
  contractId: string;
  currentReference: string | null;
  onUpdate?: () => void;
}

export const ContractReferenceEditor = ({
  contractId,
  currentReference,
  onUpdate,
}: ContractReferenceEditorProps) => {
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
      const { error } = await supabase
        .from('contracts')
        .update({ 
          contract_number: reference.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) {
        console.error("Error updating contract reference:", error);
        toast.error("Erreur lors de la mise à jour de la référence");
      } else {
        toast.success("Référence mise à jour avec succès");
        setIsOpen(false);
        onUpdate?.();
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
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 w-8 p-0"
        title="Modifier la référence"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le numéro de contrat</DialogTitle>
            <DialogDescription>
              Saisissez le numéro de référence du partenaire financier pour ce contrat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="reference" className="text-sm font-medium">
                Numéro de contrat
              </label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: CONT-2025-001"
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
