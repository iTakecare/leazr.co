import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import { useClientData } from '@/hooks/useClientData';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import { createClientRequest } from '@/services/offers/clientRequests';
import { formatCurrency } from '@/utils/formatters';
import { getProductPrice } from '@/utils/productPricing';
import { toast } from 'sonner';
import { Check, User, Mail, Building, Package, Euro, Loader2, Send } from 'lucide-react';

const ClientRequestSummary: React.FC = () => {
  const { navigateToClient } = useRoleNavigation();
  const { items, cartTotal, clearCart } = useCart();
  const { clientData, loading: clientLoading } = useClientData();
  const { companyId } = useMultiTenant();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientData) {
      toast.error("Impossible de récupérer vos informations client");
      return;
    }
    
    if (items.length === 0) {
      toast.error("Votre panier est vide");
      return;
    }

    if (!companyId) {
      toast.error("Erreur de configuration : ID de l'entreprise manquant");
      console.error("Company ID is missing:", { companyId, clientData });
      return;
    }
    
    setIsSubmitting(true);
    
    // Build equipment description from cart items
    const equipmentLines = items.map(item => {
      const price = getProductPrice(item.product, item.selectedOptions);
      const options = item.selectedOptions && Object.keys(item.selectedOptions).length > 0 
        ? ` (${Object.entries(item.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(', ')})`
        : '';
      return `- ${item.product.name}${options} - Quantité: ${item.quantity} - Durée: ${item.duration} mois - Prix mensuel: ${formatCurrency(price.monthlyPrice)}`;
    });
    
    const equipmentDescription = `Demande client pour les équipements suivants:\n\n${equipmentLines.join('\n')}\n\nTotal mensuel: ${formatCurrency(cartTotal)}`;
    
    // Calculate total purchase price from cart items using actual product prices
    const totalPurchasePrice = items.reduce((total, item) => {
      const price = getProductPrice(item.product, item.selectedOptions);
      // Use actual purchase price from product, with fallback to monthly price * realistic coefficient
      const purchasePrice = price.purchasePrice > 0 ? price.purchasePrice : (price.monthlyPrice * 2.0);
      return total + (purchasePrice * item.quantity);
    }, 0);
    
    // Calculate coefficient and financed amount
    const defaultDuration = 36;
    const coefficient = totalPurchasePrice > 0 ? (cartTotal * 100) / totalPurchasePrice : 2.8;
    const financedAmount = totalPurchasePrice + (totalPurchasePrice * 0.15); // Purchase price + 15% margin
    
    const requestData = {
      type: 'client_request',
      client_name: clientData.name || 'Client',
      client_email: clientData.email || '',
      client_contact_email: clientData.email || '',
      equipment_description: equipmentDescription,
      amount: Number(totalPurchasePrice) || 0, // Total purchase price
      monthly_payment: Number(cartTotal) || 0, // Total monthly payment
      financed_amount: Number(financedAmount) || 0, // Purchase price + margin
      coefficient: Number(coefficient.toFixed(2)) || 2.8,
      margin: Number(financedAmount - totalPurchasePrice) || 0, // Actual margin
      status: 'pending',
      workflow_status: 'draft',
      company_id: companyId,
      client_id: clientData.id || null,
      remarks: message || 'Demande envoyée depuis l\'espace client'
    };

    // Prepare cart items with pricing for equipment creation
    const cartItemsWithPricing = items.map(item => ({
      ...item,
      price: getProductPrice(item.product, item.selectedOptions)
    }));

    console.log("Submitting client request with data:", requestData);
    
    try {
      const response = await createClientRequest(requestData, cartItemsWithPricing);
      
      if (response.error) {
        console.error("Error from createClientRequest:", response.error);
        const errorMessage = response.error.message || 'Erreur lors de la création de la demande';
        throw new Error(errorMessage);
      }

      if (!response.data) {
        console.error("No data returned from createClientRequest:", response);
        throw new Error('Aucune donnée retournée lors de la création de la demande');
      }
      
      console.log("Client request created successfully:", response.data);
      
      // Clear cart and navigate to success page
      clearCart();
      toast.success("Votre demande a été envoyée avec succès !");
      
      // Navigate to client dashboard with success message
      navigateToClient('dashboard');
      
    } catch (error: any) {
      console.error("Error submitting request:", error);
      console.error("Request data that failed:", requestData);
      
      let errorMessage = "Une erreur est survenue lors de l'envoi de votre demande.";
      
      if (error.message) {
        if (error.message.includes('company_id')) {
          errorMessage = "Erreur de configuration de l'entreprise. Contactez le support.";
        } else if (error.message.includes('client_name')) {
          errorMessage = "Nom client requis. Vérifiez vos informations de profil.";
        } else if (error.message.includes('amount')) {
          errorMessage = "Montant invalide. Vérifiez votre panier.";
        } else {
          errorMessage = `Erreur: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (clientLoading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Chargement de vos informations...</span>
        </div>
      </div>
    );
  }
  
  if (!clientData) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="text-center py-8">
          <p className="text-destructive">Impossible de charger vos informations client.</p>
          <Button onClick={() => navigateToClient('dashboard')} className="mt-4">
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Information Summary */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Vos informations</h2>
              <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                <Check className="h-3 w-3 mr-1" />
                Confirmées
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Nom</p>
                  <p className="font-medium">{clientData.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{clientData.email || 'Non renseigné'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Entreprise</p>
                  <p className="font-medium">{clientData.company || 'Non renseigné'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Products Summary */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Produits demandés</h2>
              <Badge variant="secondary">
                {items.length} produit{items.length > 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="space-y-4">
              {items.map((item) => {
                const price = getProductPrice(item.product, item.selectedOptions);
                return (
                  <div key={item.product.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                    <div className="w-16 h-16 bg-background rounded-md overflow-hidden flex-shrink-0 border">
                      <img 
                        src={item.product.image_url || '/placeholder.svg'} 
                        alt={item.product.name}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.product.brand && `${item.product.brand} • `}
                        Quantité: {item.quantity} • Durée: {item.duration} mois
                      </p>
                      
                      {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Options: {Object.entries(item.selectedOptions).map(([key, value], index, arr) => (
                            <span key={key}>
                              {key}: {value}
                              {index < arr.length - 1 ? ' | ' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium text-primary">
                        {formatCurrency(price.monthlyPrice * item.quantity)} / mois
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Separator className="my-6" />
            
            <div className="flex justify-between items-center text-lg">
              <div className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-primary" />
                <span className="font-semibold">Total mensuel</span>
              </div>
              <span className="font-bold text-primary text-xl">
                {formatCurrency(cartTotal)}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mt-2">
              Prix HT • Engagement sur 36 mois par défaut
            </p>
          </div>
        </div>
        
        {/* Message Section */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="p-6">
            <div className="space-y-2">
              <Label htmlFor="message">Message complémentaire (optionnel)</Label>
              <Textarea
                id="message"
                placeholder="Ajoutez ici des informations complémentaires concernant votre demande..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </div>
        
        {/* Submit Section */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="p-6">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                <p className="font-medium mb-2">Que se passe-t-il après l'envoi ?</p>
                <ul className="space-y-1 text-xs">
                  <li>• Votre demande sera transmise à notre équipe commerciale</li>
                  <li>• Vous recevrez un accusé de réception par email</li>
                  <li>• Un conseiller vous contactera sous 24-48h pour finaliser votre offre</li>
                  <li>• Vous pourrez suivre l'avancement dans votre espace client</li>
                </ul>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={isSubmitting || items.length === 0}
                  className="min-w-[200px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer ma demande
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ClientRequestSummary;