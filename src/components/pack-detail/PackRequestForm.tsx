import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductPack } from "@/types/pack";
import { createProductRequest } from "@/services/requestInfoService";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Loader2 } from "lucide-react";

interface PackRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  pack: ProductPack;
  quantity: number;
  monthlyPrice: number;
  companySlug?: string;
}

const PackRequestForm: React.FC<PackRequestFormProps> = ({
  isOpen,
  onClose,
  pack,
  quantity,
  monthlyPrice,
  companySlug
}) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    hasClientAccount: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.company) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      console.log("Préparation de la demande de pack...");
      
      // Build equipment description for pack
      const itemsDescription = pack.items?.map(item => 
        `${item.product?.name || 'Produit'} (x${item.quantity})`
      ).join(", ") || "";

      const equipmentDescription = `Pack: ${pack.name} ${quantity > 1 ? `(${quantity} packs)` : ''} - Contient: ${itemsDescription} - Durée: ${pack.selected_duration || 36} mois`;

      // Calculate financed amount using standard coefficient
      const defaultCoefficient = 3.27;
      const financedAmount = (monthlyPrice * 100) / defaultCoefficient;

      const requestData = {
        client_name: formData.name,
        client_email: formData.email,
        client_company: formData.company,
        client_contact_email: formData.email,
        equipment_description: equipmentDescription,
        message: formData.message,
        amount: pack.total_purchase_price * quantity,
        monthly_payment: monthlyPrice,
        financed_amount: financedAmount,
        coefficient: defaultCoefficient,
        quantity: quantity,
        duration: pack.selected_duration || 36,
        phone: formData.phone,
        has_client_account: formData.hasClientAccount
      };
      
      console.log("Envoi de la demande de pack...", requestData);
      
      try {
        const result = await createProductRequest(requestData);
        
        console.log("Demande envoyée avec succès:", result);
        toast.success("Votre demande a été envoyée avec succès");
        onClose();
        
        const redirectPath = companySlug ? `/${companySlug}/demande-envoyee` : "/demande-envoyee";
        navigate(redirectPath, {
          state: { 
            success: true, 
            companyName: formData.company,
            name: formData.name
          }
        });
      } catch (error) {
        console.error("Erreur lors de l'envoi de la demande:", error);
        toast.error("Une erreur est survenue lors de l'envoi de votre demande");
      }
    } catch (error) {
      console.error("Erreur lors de la préparation de la demande:", error);
      toast.error("Une erreur est survenue lors de l'envoi de votre demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = pack.items?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demande d'offre - Pack</DialogTitle>
          <DialogDescription>
            Remplissez ce formulaire pour recevoir une offre personnalisée pour ce pack
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
              {pack.image_url ? (
                <img 
                  src={pack.image_url} 
                  alt={pack.name} 
                  className="object-contain max-h-full max-w-full"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
              ) : (
                <div className="text-gray-400">
                  <Package className="h-10 w-10" />
                </div>
              )}
            </div>
            
            <div>
              <h4 className="font-bold text-lg">{pack.name}</h4>
              <p className="text-sm text-gray-500">
                {quantity} {quantity > 1 ? "packs" : "pack"} - {pack.selected_duration || 36} mois
              </p>
              
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {totalItems} produit{totalItems > 1 ? 's' : ''}
                </Badge>
                {pack.is_featured && (
                  <Badge variant="default" className="text-xs">
                    Pack vedette
                  </Badge>
                )}
              </div>
              
              <div className="mt-2 text-primary font-semibold">
                {formatCurrency(monthlyPrice)} HT / mois
              </div>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Entreprise *</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Précisez ici toute information complémentaire concernant votre demande de pack..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasClientAccount"
                checked={formData.hasClientAccount}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasClientAccount: !!checked }))}
              />
              <Label htmlFor="hasClientAccount" className="text-sm">
                Je souhaite créer un compte client pour suivre mes demandes
              </Label>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Récapitulatif de votre demande</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Pack:</span>
                <span className="font-medium">{pack.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Produits inclus:</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantité:</span>
                <span>{quantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Durée:</span>
                <span>{pack.selected_duration || 36} mois</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span>Mensualité estimée:</span>
                <span className="font-bold text-primary">{formatCurrency(monthlyPrice)} HT / mois</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                "Envoyer ma demande"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PackRequestForm;