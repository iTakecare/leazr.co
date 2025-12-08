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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { DatePicker } from "@/components/ui/date-picker";

interface NewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NewInvoiceDialog = ({ open, onOpenChange, onSuccess }: NewInvoiceDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'leasing' | 'purchase'>('purchase');
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const { companyId } = useMultiTenant();

  const handleSubmit = async () => {
    if (!companyId) {
      toast.error("Erreur: entreprise non trouvée");
      return;
    }

    if (!clientName.trim()) {
      toast.error("Veuillez entrer un nom de client");
      return;
    }

    const invoiceAmount = parseFloat(amount);
    if (isNaN(invoiceAmount) || invoiceAmount <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    setLoading(true);
    try {
      // Générer un numéro de facture unique
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      const billingData = {
        client_data: {
          name: clientName,
          company: clientName
        },
        equipment_data: description ? [{
          title: description,
          quantity: 1,
          purchase_price: invoiceAmount,
          selling_price: invoiceAmount
        }] : []
      };

      const { error } = await supabase
        .from('invoices')
        .insert({
          company_id: companyId,
          invoice_number: invoiceNumber,
          invoice_type: invoiceType,
          leaser_name: clientName,
          amount: invoiceAmount,
          status: 'pending',
          integration_type: 'manual',
          invoice_date: invoiceDate?.toISOString(),
          due_date: dueDate?.toISOString(),
          billing_data: billingData
        });

      if (error) throw error;

      toast.success("Facture créée avec succès");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setClientName("");
      setAmount("");
      setDescription("");
      setInvoiceDate(new Date());
      setDueDate(undefined);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de la création de la facture");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nouvelle facture
          </DialogTitle>
          <DialogDescription>
            Créer une nouvelle facture manuelle.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type de facture</Label>
            <Select value={invoiceType} onValueChange={(v: 'leasing' | 'purchase') => setInvoiceType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Achat</SelectItem>
                <SelectItem value="leasing">Leasing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Nom du client *</Label>
            <Input
              id="client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: Société ABC"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Montant (€) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Prestation de service"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de facture</Label>
              <DatePicker
                date={invoiceDate}
                setDate={setInvoiceDate}
              />
            </div>
            <div className="space-y-2">
              <Label>Date d'échéance</Label>
              <DatePicker
                date={dueDate}
                setDate={setDueDate}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              "Créer la facture"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
