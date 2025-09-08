import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveEquipment } from "@/services/offers/offerEquipment";
import { OfferEquipment } from "@/types/offerEquipment";

interface AddCustomEquipmentDialogProps {
  offerId: string;
  onEquipmentAdded: () => void;
}

const AddCustomEquipmentDialog: React.FC<AddCustomEquipmentDialogProps> = ({
  offerId,
  onEquipmentAdded
}) => {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    purchase_price: 0,
    quantity: 1,
    margin: 0,
    selling_price: 0,
    monthly_payment: 0
  });

  const handleInputChange = (field: string, value: string | number) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-calculate selling price when purchase price or margin changes
    if (field === 'purchase_price' || field === 'margin') {
      const purchasePrice = field === 'purchase_price' ? Number(value) : newData.purchase_price;
      const margin = field === 'margin' ? Number(value) : newData.margin;
      newData.selling_price = Number((purchasePrice * (1 + margin / 100)).toFixed(2));
    }
    
    // Auto-calculate margin when selling price changes (if purchase price exists)
    if (field === 'selling_price' && newData.purchase_price > 0) {
      const sellingPrice = Number(value);
      // Si le prix de vente est 0 (équipement offert), la marge est de 0%
      if (sellingPrice === 0) {
        newData.margin = 0;
      } else {
        const calculatedMargin = ((sellingPrice - newData.purchase_price) / newData.purchase_price) * 100;
        newData.margin = Number(calculatedMargin.toFixed(2));
      }
    }
    
    setFormData(newData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error("Veuillez saisir une description");
      return;
    }
    
    if (formData.purchase_price <= 0) {
      toast.error("Veuillez saisir un prix d'achat valide");
      return;
    }
    
    if (formData.quantity <= 0) {
      toast.error("Veuillez saisir une quantité valide");
      return;
    }

    setIsSaving(true);
    
    try {
      const equipmentData: Omit<OfferEquipment, 'id' | 'created_at' | 'updated_at'> = {
        offer_id: offerId,
        title: formData.title.trim(),
        purchase_price: formData.purchase_price,
        quantity: formData.quantity,
        margin: formData.margin,
        monthly_payment: formData.monthly_payment,
        selling_price: formData.selling_price
      };
      
      const result = await saveEquipment(equipmentData);
      
      if (result) {
        toast.success("Équipement ajouté avec succès");
        setFormData({
          title: "",
          purchase_price: 0,
          quantity: 1,
          margin: 0,
          selling_price: 0,
          monthly_payment: 0
        });
        setOpen(false);
        onEquipmentAdded();
      } else {
        toast.error("Erreur lors de l'ajout de l'équipement");
      }
    } catch (error) {
      console.error("Error saving custom equipment:", error);
      toast.error("Erreur lors de l'ajout de l'équipement");
    } finally {
      setIsSaving(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter équipement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un équipement personnalisé</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Description de l'équipement *</Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Nom ou description du produit"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Prix d'achat (€) *</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.purchase_price === 0 ? '' : formData.purchase_price}
                onChange={(e) => handleInputChange('purchase_price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="margin">Marge (%)</Label>
               <Input
                id="margin"
                type="number"
                step="0.1"
                value={formData.margin === 0 ? '' : formData.margin}
                onChange={(e) => handleInputChange('margin', parseFloat(e.target.value) || 0)}
                placeholder="0.0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="selling_price">Prix de vente (€)</Label>
              <div className="relative">
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.selling_price === 0 ? '' : formData.selling_price}
                  onChange={(e) => handleInputChange('selling_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                {formData.selling_price > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatPrice(formData.selling_price)}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="monthly_payment">Mensualité (€)</Label>
            <Input
              id="monthly_payment"
              type="number"
              step="0.01"
              min="0"
              value={formData.monthly_payment === 0 ? '' : formData.monthly_payment}
              onChange={(e) => handleInputChange('monthly_payment', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
            {formData.monthly_payment > 0 && (
              <div className="text-xs text-muted-foreground">
                {formatPrice(formData.monthly_payment)} / mois
              </div>
            )}
          </div>
          
          {/* Résumé des calculs */}
          {formData.purchase_price > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <h4 className="text-sm font-medium">Résumé</h4>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Prix d'achat unitaire:</span>
                  <span className="font-mono">{formatPrice(formData.purchase_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prix de vente unitaire:</span>
                  <span className="font-mono text-green-600">
                    {formData.selling_price === 0 ? (
                      <span className="text-blue-600">Offert (0€)</span>
                    ) : (
                      formatPrice(formData.selling_price)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Marge unitaire:</span>
                  <span className="font-mono">{formatPrice(formData.selling_price - formData.purchase_price)}</span>
                </div>
                {formData.quantity > 1 && (
                  <>
                    <hr className="my-2" />
                    <div className="flex justify-between font-medium">
                      <span>Total (×{formData.quantity}):</span>
                      <span className="font-mono">{formatPrice(formData.selling_price * formData.quantity)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSaving}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomEquipmentDialog;