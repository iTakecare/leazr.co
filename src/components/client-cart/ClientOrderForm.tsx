
import React, { useState } from "react";
import { useClientCart } from "@/context/ClientCartContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, Loader2, ShoppingCart } from "lucide-react";
import { createOffer } from "@/services/offers";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ClientOrderForm: React.FC = () => {
  const { items, getTotalPrice, clearCart } = useClientCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Préparer la description de l'équipement
  const prepareEquipmentDescription = () => {
    try {
      const equipmentData = items.map(item => ({
        title: item.product.name,
        quantity: item.quantity,
        attributes: item.selectedOptions || {},
        specifications: item.product.specifications || {},
        monthly_payment: item.monthlyPrice || item.product.monthly_price || 0,
        purchase_price: item.product.price || 0
      }));
      return JSON.stringify(equipmentData);
    } catch (e) {
      console.error("Erreur lors de la préparation de la description:", e);
      return JSON.stringify(items.map(item => item.product.name).join(", "));
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Votre panier est vide");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Préparer les données pour la création de l'offre
      const offerData = {
        client_id: user?.client_id,
        client_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        client_email: user?.email,
        monthly_payment: getTotalPrice(),
        amount: getTotalPrice() * 36, // Montant total (36 mois)
        coefficient: 3.27, // Coefficient standard
        equipment_description: prepareEquipmentDescription(),
        status: 'pending',
        type: 'client_request',
        remarks: additionalNotes
      };

      // Créer l'offre
      const { data, error } = await createOffer(offerData);

      if (error) {
        console.error("Erreur lors de la création de la demande:", error);
        setError(error.message || "Une erreur est survenue lors de la création de votre demande");
        toast.error("Erreur lors de la création de la demande");
      } else {
        setIsSuccess(true);
        clearCart();
        toast.success("Votre demande a été envoyée avec succès");
        
        // Attendre 2 secondes avant de rediriger
        setTimeout(() => {
          navigate("/client/requests");
        }, 2000);
      }
    } catch (err: any) {
      console.error("Exception lors de la création de la demande:", err);
      setError(err.message || "Une erreur inattendue est survenue");
      toast.error("Erreur lors de la création de la demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="mx-auto max-w-2xl border-green-100 bg-green-50/30">
        <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Demande envoyée avec succès</h2>
          <p className="text-center text-muted-foreground mb-6">
            Votre demande a été transmise à nos équipes. Vous pouvez suivre son statut dans la section "Mes demandes".
          </p>
          <Button asChild>
            <Link to="/client/requests">Voir mes demandes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="bg-gradient-to-r from-muted/20 to-transparent border-b">
        <CardTitle className="text-lg md:text-xl flex items-center">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Valider ma demande d'équipement
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="bg-muted/20 p-4 rounded-md">
            <h3 className="font-medium mb-3">Récapitulatif de votre panier</h3>
            
            {items.map((item, index) => (
              <div key={index} className="flex justify-between py-2 border-b last:border-0 border-muted text-sm">
                <div>
                  <span className="font-medium">{item.product.name}</span>
                  <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  {Object.entries(item.selectedOptions || {}).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {Object.entries(item.selectedOptions || {}).map(([key, value]) => (
                        <span key={key} className="mr-2">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="font-medium">
                  {formatCurrency((item.monthlyPrice || item.product.monthly_price || 0) * item.quantity)}/mois
                </div>
              </div>
            ))}
            
            <div className="flex justify-between pt-3 font-medium">
              <span>Montant total mensuel:</span>
              <span className="text-primary">{formatCurrency(getTotalPrice())}/mois</span>
            </div>
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Durée du contrat:</span>
              <span>36 mois</span>
            </div>
            
            <div className="flex justify-between mt-2 font-medium">
              <span>Montant total financé:</span>
              <span>{formatCurrency(getTotalPrice() * 36)}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Remarques ou informations complémentaires (optionnel)
            </label>
            <Textarea
              placeholder="Précisez ici toute information utile concernant votre demande..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t bg-muted/10 p-4">
        <Button variant="outline" asChild>
          <Link to="/client/requests">Annuler</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            "Valider ma demande"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClientOrderForm;
