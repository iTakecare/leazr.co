import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, RefreshCw, Loader2, PackageX } from "lucide-react";
import { swapContractEquipment } from "@/services/stockService";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";

interface SwapEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  offerId?: string | null;
  /** La ligne d'équipement à remplacer. */
  equipment: {
    id: string;
    title: string;
    serial_number?: string | null;
    purchase_price?: number | null;
    actual_purchase_price?: number | null;
  };
  onDone?: () => void;
}

const SwapEquipmentDialog: React.FC<SwapEquipmentDialogProps> = ({
  open,
  onOpenChange,
  contractId,
  offerId,
  equipment,
  onDone,
}) => {
  const { companyId } = useMultiTenant();
  const { user } = useAuth();

  const oldPrice = Number(equipment.actual_purchase_price ?? equipment.purchase_price ?? 0);

  const [newTitle, setNewTitle] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const newPriceNum = parseFloat(newPrice.replace(",", ".")) || 0;
  const delta = newPriceNum - oldPrice;

  const reset = () => {
    setNewTitle("");
    setNewSerial("");
    setNewPrice("");
    setReason("");
  };

  const handleSubmit = async () => {
    if (!companyId || !user?.id) return;
    if (!newTitle.trim()) {
      toast.error("Indiquez le nouvel appareil");
      return;
    }
    setSaving(true);
    try {
      await swapContractEquipment({
        companyId,
        contractId,
        contractEquipmentId: equipment.id,
        offerId: offerId ?? null,
        oldTitle: equipment.title,
        oldSerialNumber: equipment.serial_number ?? null,
        oldPurchasePrice: oldPrice,
        newTitle: newTitle.trim(),
        newSerialNumber: newSerial.trim() || null,
        newPurchasePrice: newPriceNum,
        reason: reason.trim(),
        userId: user.id,
      });
      toast.success("Appareil remplacé. Ancien appareil envoyé dans le stock (onglet Swap).");
      reset();
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      console.error("[SwapEquipmentDialog] swap error:", e);
      toast.error("Erreur lors du swap de l'appareil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-amber-600" />
            Swap d'appareil
          </DialogTitle>
          <DialogDescription>
            Remplace l'appareil défectueux sur le contrat. L'ancien repart dans le stock
            (onglet Swap) et la marge est recalculée. La mensualité du client ne change pas.
          </DialogDescription>
        </DialogHeader>

        {/* Ancien appareil */}
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
            <PackageX className="h-3.5 w-3.5" /> Appareil retiré (→ stock)
          </div>
          <p className="font-medium text-sm">{equipment.title}</p>
          <p className="text-xs text-muted-foreground">
            {equipment.serial_number ? `S/N : ${equipment.serial_number} · ` : ""}
            Prix d'achat : {formatCurrency(oldPrice)}
          </p>
        </div>

        <div className="flex justify-center -my-1">
          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
        </div>

        {/* Nouvel appareil */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="swap-title">Nouvel appareil *</Label>
            <Input
              id="swap-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="ex. iPhone 16 Pro Max"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="swap-serial">Numéro de série</Label>
              <Input
                id="swap-serial"
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value)}
                placeholder="S/N du nouvel appareil"
              />
            </div>
            <div>
              <Label htmlFor="swap-price">Prix d'achat (HTVA)</Label>
              <Input
                id="swap-price"
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder={oldPrice ? String(oldPrice) : "0.00"}
              />
            </div>
          </div>

          {newPrice !== "" && (
            <p className="text-xs">
              Écart de coût :{" "}
              <span className={delta > 0 ? "text-red-600 font-medium" : delta < 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                {delta > 0 ? "+" : ""}{formatCurrency(delta)}
              </span>{" "}
              <span className="text-muted-foreground">
                ({delta > 0 ? "marge en baisse" : delta < 0 ? "marge en hausse" : "marge inchangée"})
              </span>
            </p>
          )}

          <div>
            <Label htmlFor="swap-reason">Raison du swap</Label>
            <Textarea
              id="swap-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex. écran défectueux, retour SAV…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !newTitle.trim()} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Effectuer le swap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SwapEquipmentDialog;
