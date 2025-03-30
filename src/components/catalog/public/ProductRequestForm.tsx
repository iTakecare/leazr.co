
import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Product } from "@/types/catalog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createClientRequest } from "@/services/offers/clientRequests";
import { formatCurrency } from "@/utils/formatters";

interface ProductRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  quantity: number;
  selectedOptions: Record<string, string>;
  duration: number;
  monthlyPrice: number;
}

const ProductRequestForm: React.FC<ProductRequestFormProps> = ({
  isOpen,
  onClose,
  product,
  quantity,
  selectedOptions,
  duration,
  monthlyPrice
}) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Formater les options sélectionnées pour le descriptif de l'équipement
      const optionsText = Object.entries(selectedOptions)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
      
      // Préparer la description complète de l'équipement avec les données JSON
      const equipmentData = [{
        name: product.name,
        brand: product.brand || "Non spécifié",
        description: product.description || "",
        specifications: selectedOptions,
        quantity: quantity,
        purchasePrice: product.price || 0,
        monthlyPayment: monthlyPrice / quantity, // Prix mensuel par unité
        totalMonthly: monthlyPrice, // Prix mensuel total
      }];
      
      // Convertir l'équipement en format JSON pour le stockage
      const equipmentDescription = JSON.stringify(equipmentData);
      
      console.log("Creating client request for product:", {
        product: product.name,
        monthlyPrice,
        quantity,
        equipmentDescription
      });
      
      // Calculer la commission (10% du prix mensuel)
      const commission = monthlyPrice * 0.1;
      
      const { data, error } = await createClientRequest({
        client_name: name,
        client_email: email,
        equipment_description: equipmentDescription,
        amount: product.price * quantity || 0,
        monthly_payment: monthlyPrice,
        coefficient: 0, // Sera calculé côté serveur si nécessaire
        commission: commission, // Ajout de la commission manquante
        user_id: "anonymous", // Ajout d'un user_id par défaut pour les requêtes publiques
        remarks: `Demande pour ${product.name} (${optionsText}) - ${comments}\nSociété: ${company}`,
        type: "client_request",
      });
      
      if (error) {
        throw error;
      }
      
      toast.success("Votre demande a été envoyée avec succès!");
      onClose();
      navigate("/demande-envoyee");
    } catch (error) {
      console.error("Erreur lors de l'envoi de la demande:", error);
      toast.error("Une erreur s'est produite lors de l'envoi de votre demande.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Faire une demande pour {product.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom <span className="text-red-500">*</span></Label>
              <Input 
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company">Entreprise</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nom de votre entreprise"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="summary">Résumé de votre demande</Label>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <p className="font-medium text-gray-800">{product.name}</p>
              <p className="text-gray-600">Quantité: {quantity}</p>
              
              {Object.entries(selectedOptions).length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-700">Configuration:</p>
                  <ul className="text-sm text-gray-600 ml-4">
                    {Object.entries(selectedOptions).map(([key, value]) => (
                      <li key={key}>{key}: {value}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                <span className="font-medium">Mensualité:</span>
                <span className="font-bold text-indigo-600">{formatCurrency(monthlyPrice)}/mois</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comments">Commentaires additionnels</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Information supplémentaires pour votre demande"
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductRequestForm;
