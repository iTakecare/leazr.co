import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { StockItem, fetchStockItems, performSwap, CONDITION_CONFIG } from "@/services/stockService";
import { useAuth } from "@/context/AuthContext";
import { ArrowRightLeft, Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItem: StockItem;
  contractId: string;
  companyId: string;
  onSuccess: () => void;
}

const SwapDialog: React.FC<SwapDialogProps> = ({
  open, onOpenChange, currentItem, contractId, companyId, onSuccess
}) => {
  const { user } = useAuth();
  const [availableItems, setAvailableItems] = useState<StockItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedItem(null);
      setReason("");
      setSearch("");
      loadAvailable();
    }
  }, [open]);

  const loadAvailable = async () => {
    setLoading(true);
    try {
      const items = await fetchStockItems(companyId, 'in_stock');
      setAvailableItems(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = availableItems.filter(item => {
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.serial_number || '').toLowerCase().includes(q)
    );
  });

  const handleSubmit = async () => {
    if (!selectedItem || !reason.trim() || !user) return;
    setSubmitting(true);
    try {
      await performSwap(
        companyId,
        currentItem.id,
        selectedItem.id,
        contractId,
        currentItem.current_contract_equipment_id,
        reason,
        user.id
      );
      toast({ title: "Swap effectué", description: `${currentItem.title} remplacé par ${selectedItem.title}` });
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Swap - Remplacement de matériel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-md border bg-muted/50">
            <p className="text-sm font-medium">Article à remplacer</p>
            <p className="text-sm text-muted-foreground">{currentItem.title} {currentItem.serial_number ? `(${currentItem.serial_number})` : ''}</p>
          </div>

          <div className="space-y-2">
            <Label>Raison du swap *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Écran cassé, batterie défaillante..." />
          </div>

          <div className="space-y-2">
            <Label>Article de remplacement *</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par titre ou n° série..." className="pl-9" />
            </div>

            <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
              {loading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">Aucun article disponible en stock</p>
              ) : (
                filtered.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors ${selectedItem?.id === item.id ? 'bg-accent' : ''}`}
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.serial_number && <span>S/N: {item.serial_number}</span>}
                      <Badge variant="outline" className="text-xs">{CONDITION_CONFIG[item.condition]?.label}</Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!selectedItem || !reason.trim() || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmer le swap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SwapDialog;
