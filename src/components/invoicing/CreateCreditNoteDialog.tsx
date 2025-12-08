import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { createCreditNote } from "@/services/creditNoteService";
import { useMultiTenant } from "@/hooks/useMultiTenant";

interface CreateCreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string | null;
  invoiceAmount: number;
  onSuccess: () => void;
}

export const CreateCreditNoteDialog = ({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  invoiceAmount,
  onSuccess
}: CreateCreditNoteDialogProps) => {
  const [amount, setAmount] = useState(invoiceAmount.toString());
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { companyId } = useMultiTenant();

  const handleSubmit = async () => {
    if (!companyId) {
      toast.error("Erreur: entreprise non trouvée");
      return;
    }

    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    if (creditAmount > invoiceAmount) {
      toast.error("Le montant ne peut pas dépasser le montant de la facture");
      return;
    }

    if (!reason.trim()) {
      toast.error("Veuillez indiquer une raison");
      return;
    }

    setLoading(true);
    try {
      await createCreditNote(companyId, invoiceId, creditAmount, reason);
      toast.success("Note de crédit créée avec succès");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de la création de la note de crédit");
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Établir une note de crédit
          </DialogTitle>
          <DialogDescription>
            Créer une note de crédit pour la facture {invoiceNumber || invoiceId.substring(0, 8)}.
            Cette action mettra à jour les montants dans le Dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Montant de la facture</p>
            <p className="text-lg font-semibold">{formatAmount(invoiceAmount)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Montant à créditer (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={invoiceAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Raison de la note de crédit *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Annulation de commande, erreur de facturation, avoir commercial..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} variant="destructive">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              "Créer la note de crédit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
