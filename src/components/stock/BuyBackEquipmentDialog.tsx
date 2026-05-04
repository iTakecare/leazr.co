/**
 * BuyBackEquipmentDialog
 *
 * Reprise d'un équipement de contrat en stock.
 * - Demande la valeur de rachat (saisie manuelle, vient du leaser)
 * - Demande l'état du matériel
 * - Crée un stock_item (source='contract_buyback') + marque le contract_equipment
 *   comme repris (bought_back_at + bought_back_price)
 */
import React, { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Warehouse } from "lucide-react";
import {
  StockCondition,
  CONDITION_CONFIG,
  buyBackContractEquipment,
} from "@/services/stockService";
import { useAuth } from "@/context/AuthContext";

interface BuyBackEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  companyId: string;
  contractEquipment: {
    id: string;
    title: string;
    serial_number?: string | null;
    purchase_price?: number;
  };
  onSuccess: () => void;
}

const BuyBackEquipmentDialog: React.FC<BuyBackEquipmentDialogProps> = ({
  open,
  onOpenChange,
  contractId,
  companyId,
  contractEquipment,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [buybackPrice, setBuybackPrice] = useState<string>("");
  const [condition, setCondition] = useState<StockCondition>("good");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    const price = parseFloat(buybackPrice.replace(",", "."));
    if (isNaN(price) || price < 0) {
      toast({
        title: "Valeur invalide",
        description: "Veuillez saisir une valeur de rachat valide.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await buyBackContractEquipment({
        companyId,
        contractId,
        contractEquipment: {
          id: contractEquipment.id,
          title: contractEquipment.title,
          serial_number: contractEquipment.serial_number,
        },
        buybackPrice: price,
        condition,
        notes: notes || null,
        userId: user.id,
      });

      toast({
        title: "Matériel repris en stock",
        description: `${contractEquipment.title} ajouté au stock pour ${price.toFixed(2)} €`,
      });
      onSuccess();
      onOpenChange(false);
      // reset
      setBuybackPrice("");
      setNotes("");
      setCondition("good");
    } catch (e: any) {
      toast({
        title: "Erreur lors de la reprise",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Reprendre en stock
          </DialogTitle>
          <DialogDescription>
            Le matériel <strong>"{contractEquipment.title}"</strong>
            {contractEquipment.serial_number && (
              <>
                {" "}(S/N <span className="font-mono">{contractEquipment.serial_number}</span>)
              </>
            )}{" "}
            sera ajouté au stock comme reprise de contrat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="buyback-price">
              Valeur de rachat (€) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="buyback-price"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 250.00"
              value={buybackPrice}
              onChange={(e) => setBuybackPrice(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Valeur payée au leaser pour racheter cet équipement.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="buyback-condition">État du matériel</Label>
            <Select
              value={condition}
              onValueChange={(v) => setCondition(v as StockCondition)}
            >
              <SelectTrigger id="buyback-condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONDITION_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="buyback-notes">Notes (optionnel)</Label>
            <Textarea
              id="buyback-notes"
              placeholder="Ex: Reprise suite évolution matériel client"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !buybackPrice}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reprise…
              </>
            ) : (
              "Confirmer la reprise"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuyBackEquipmentDialog;
