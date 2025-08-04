import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createClientCustomVariant,
  updateClientCustomVariant,
  type ClientCustomVariant,
  type CreateClientCustomVariantData,
  type UpdateClientCustomVariantData
} from "@/services/clientCustomVariantService";

interface ClientCustomVariantEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  productId: string;
  productName: string;
  variant?: ClientCustomVariant | null;
  onSuccess?: () => void;
}

const ClientCustomVariantEditor: React.FC<ClientCustomVariantEditorProps> = ({
  open,
  onOpenChange,
  clientId,
  productId,
  productName,
  variant,
  onSuccess
}) => {
  const [variantName, setVariantName] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [customPurchasePrice, setCustomPurchasePrice] = useState<string>("");
  const [customMonthlyPrice, setCustomMonthlyPrice] = useState<string>("");
  const [marginRate, setMarginRate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [newAttributeKey, setNewAttributeKey] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when dialog opens/closes or variant changes
  useEffect(() => {
    if (variant) {
      setVariantName(variant.variant_name);
      setAttributes(variant.attributes);
      setCustomPurchasePrice(variant.custom_purchase_price?.toString() || "");
      setCustomMonthlyPrice(variant.custom_monthly_price?.toString() || "");
      setMarginRate(variant.margin_rate?.toString() || "");
      setNotes(variant.notes || "");
    } else {
      setVariantName("");
      setAttributes({});
      setCustomPurchasePrice("");
      setCustomMonthlyPrice("");
      setMarginRate("");
      setNotes("");
    }
    setNewAttributeKey("");
    setNewAttributeValue("");
  }, [variant, open]);

  const createMutation = useMutation({
    mutationFn: (data: CreateClientCustomVariantData) => createClientCustomVariant(data),
    onSuccess: () => {
      toast({
        title: "Variante créée",
        description: "La variante personnalisée a été créée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["client-custom-variants", clientId, productId] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error creating custom variant:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la variante personnalisée.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientCustomVariantData }) =>
      updateClientCustomVariant(id, data),
    onSuccess: () => {
      toast({
        title: "Variante mise à jour",
        description: "La variante personnalisée a été mise à jour avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["client-custom-variants", clientId, productId] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating custom variant:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la variante personnalisée.",
        variant: "destructive",
      });
    },
  });

  const handleAddAttribute = () => {
    if (newAttributeKey && newAttributeValue) {
      setAttributes(prev => ({
        ...prev,
        [newAttributeKey]: newAttributeValue
      }));
      setNewAttributeKey("");
      setNewAttributeValue("");
    }
  };

  const handleRemoveAttribute = (key: string) => {
    setAttributes(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!variantName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la variante est requis.",
        variant: "destructive",
      });
      return;
    }

    const variantData = {
      client_id: clientId,
      product_id: productId,
      variant_name: variantName,
      attributes,
      custom_purchase_price: customPurchasePrice ? parseFloat(customPurchasePrice) : undefined,
      custom_monthly_price: customMonthlyPrice ? parseFloat(customMonthlyPrice) : undefined,
      margin_rate: marginRate ? parseFloat(marginRate) : undefined,
      notes: notes || undefined,
    };

    if (variant) {
      updateMutation.mutate({
        id: variant.id,
        data: {
          variant_name: variantData.variant_name,
          attributes: variantData.attributes,
          custom_purchase_price: variantData.custom_purchase_price,
          custom_monthly_price: variantData.custom_monthly_price,
          margin_rate: variantData.margin_rate,
          notes: variantData.notes,
        }
      });
    } else {
      createMutation.mutate(variantData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {variant ? "Modifier" : "Créer"} une variante personnalisée
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Produit: {productName}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="variantName">Nom de la variante *</Label>
            <Input
              id="variantName"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              placeholder="Ex: Configuration Pro"
              required
            />
          </div>

          <div className="space-y-4">
            <Label>Attributs de la variante</Label>
            
            {/* Existing attributes */}
            <div className="space-y-2">
              {Object.entries(attributes).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 border rounded">
                  <Badge variant="outline">{key}</Badge>
                  <span>:</span>
                  <span className="flex-1">{value}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttribute(key)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add new attribute */}
            <div className="flex gap-2">
              <Input
                placeholder="Nom de l'attribut"
                value={newAttributeKey}
                onChange={(e) => setNewAttributeKey(e.target.value)}
              />
              <Input
                placeholder="Valeur"
                value={newAttributeValue}
                onChange={(e) => setNewAttributeValue(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddAttribute}
                disabled={!newAttributeKey || !newAttributeValue}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customPurchasePrice">Prix d'achat personnalisé (€)</Label>
              <Input
                id="customPurchasePrice"
                type="number"
                step="0.01"
                value={customPurchasePrice}
                onChange={(e) => setCustomPurchasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customMonthlyPrice">Prix mensuel personnalisé (€)</Label>
              <Input
                id="customMonthlyPrice"
                type="number"
                step="0.01"
                value={customMonthlyPrice}
                onChange={(e) => setCustomMonthlyPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marginRate">Taux de marge (%)</Label>
            <Input
              id="marginRate"
              type="number"
              step="0.01"
              value={marginRate}
              onChange={(e) => setMarginRate(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles sur cette variante..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Enregistrement..."
                : variant
                ? "Mettre à jour"
                : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientCustomVariantEditor;
