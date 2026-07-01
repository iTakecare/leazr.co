import { useEffect, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CheckIcon, ChevronsUpDownIcon, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { DatePicker } from "@/components/ui/date-picker";
import { getAllClients } from "@/services/clientService";
import { Client } from "@/types/client";
import { cn } from "@/lib/utils";

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
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const { companyId } = useMultiTenant();

  useEffect(() => {
    if (open) {
      getAllClients().then(setClients).catch(() => setClients([]));
    }
  }, [open]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientName(client.company || client.name);
    setClientPickerOpen(false);
  };

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
        client_data: selectedClient ? {
          name: selectedClient.name,
          company: selectedClient.company || selectedClient.name,
          address: selectedClient.billing_address || selectedClient.address || "",
          city: selectedClient.billing_city || selectedClient.city || "",
          postal_code: selectedClient.billing_postal_code || selectedClient.postal_code || "",
          country: selectedClient.billing_country || selectedClient.country || "",
          email: selectedClient.email || "",
          phone: selectedClient.phone || "",
          vat_number: selectedClient.vat_number || ""
        } : {
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
          status: 'draft',
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
      setSelectedClient(null);
      setAmount("");
      setDescription("");
      setInvoiceDate(new Date());
      setDueDate(undefined);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(`Erreur lors de la création de la facture${error?.message ? ` : ${error.message}` : ""}`);
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
            <Label htmlFor="client">Client existant (optionnel)</Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedClient ? (selectedClient.company || selectedClient.name) : "Rechercher un client..."}
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Rechercher un client..." />
                  <CommandList>
                    <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={`${client.company || ""} ${client.name}`}
                          onSelect={() => handleSelectClient(client)}
                        >
                          <CheckIcon className={cn("mr-2 h-4 w-4", selectedClient?.id === client.id ? "opacity-100" : "opacity-0")} />
                          {client.company || client.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Sélectionner un client existant remplit automatiquement ses coordonnées de facturation (adresse, TVA, email...).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-name">Nom du client (facture) *</Label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                if (selectedClient) setSelectedClient(null);
              }}
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
