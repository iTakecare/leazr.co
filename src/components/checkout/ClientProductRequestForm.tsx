import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import { useClientData } from '@/hooks/useClientData';
import { createProductRequest } from '@/services/requestInfoService';
import { formatCurrency } from '@/utils/formatters';
import { getProductPrice } from '@/utils/productPricing';
import { toast } from 'sonner';
import { Check, User, Mail, Phone, Building, MapPin, Package, Calendar, Euro, Loader2 } from 'lucide-react';

const ClientProductRequestForm: React.FC = () => {
  const navigate = useNavigate();
  const { items, cartTotal, clearCart } = useCart();
  const { clientData, loading: clientLoading } = useClientData();
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
    
    setIsSubmitting(true);
    
    try {
      // Build equipment description from cart items
      const equipmentLines = items.map(item => {
        const price = getProductPrice(item.product, item.selectedOptions);
        const options = item.selectedOptions && Object.keys(item.selectedOptions).length > 0 
          ? ` (${Object.entries(item.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(', ')})`
          : '';
        return `- ${item.product.name}${options} - Quantité: ${item.quantity} - Durée: ${item.duration} mois - Prix mensuel: ${formatCurrency(price.monthlyPrice)}`;
      });
      
      const equipmentDescription = `Demande pour les équipements suivants:\n\n${equipmentLines.join('\n')}\n\nTotal mensuel: ${formatCurrency(cartTotal)}`;
      
      // Calculate total financed amount (assuming 36 months default)
      const defaultDuration = 36;
      const financedAmount = cartTotal * defaultDuration;
      
      const requestData = {
        client_name: clientData.name,
        client_email: clientData.email || '',
        client_company: clientData.company || '',
        client_contact_email: clientData.email || '',
        client_country: clientData.country || 'BE',
        client_vat_number: clientData.vat_number || '',
        client_is_vat_exempt: false,
        equipment_description: equipmentDescription,
        message: message || 'Demande envoyée depuis l\'espace client',
        amount: cartTotal,
        monthly_payment: cartTotal,
        financed_amount: financedAmount,
        coefficient: 1,
        margin: 0,
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        duration: defaultDuration,
        address: clientData.address || '',
        city: clientData.city || '',
        postal_code: clientData.postal_code || '',
        country: clientData.country || 'BE',
        phone: clientData.phone || '',
        // Use client_id if available to link to existing client
        company_id: clientData.id
      };
      
      const response = await createProductRequest(requestData);
      
      // Clear cart and navigate to success page
      clearCart();
      toast.success("Votre demande a été envoyée avec succès !");
      
      // Navigate to client dashboard with success message
      navigate('/client/dashboard', { 
        state: { 
          message: "Votre demande a été envoyée avec succès ! Vous recevrez une réponse sous peu.",
          requestId: response.id 
        }
      });
      
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (clientLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Chargement de vos informations...</span>
        </div>
      </div>
    );
  }
  
  if (!clientData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <p className="text-red-600">Impossible de charger vos informations client.</p>
          <Button onClick={() => navigate('/client/dashboard')} className="mt-4">
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Information Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Vos informations</h2>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Check className="h-3 w-3 mr-1" />
                Pré-remplies
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="client_name">Nom complet</Label>
                <div className="relative">
                  <Input
                    id="client_name"
                    value={clientData.name}
                    className="pl-10 bg-gray-50"
                    readOnly
                  />
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client_email">Email</Label>
                <div className="relative">
                  <Input
                    id="client_email"
                    value={clientData.email || ''}
                    className="pl-10 bg-gray-50"
                    readOnly
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client_company">Entreprise</Label>
                <div className="relative">
                  <Input
                    id="client_company"
                    value={clientData.company || ''}
                    className="pl-10 bg-gray-50"
                    readOnly
                  />
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client_phone">Téléphone</Label>
                <div className="relative">
                  <Input
                    id="client_phone"
                    value={clientData.phone || ''}
                    className="pl-10 bg-gray-50"
                    readOnly
                  />
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client_address">Adresse complète</Label>
                <div className="relative">
                  <Input
                    id="client_address"
                    value={`${clientData.address || ''} ${clientData.city || ''} ${clientData.postal_code || ''} ${clientData.country || ''}`.trim()}
                    className="pl-10 bg-gray-50"
                    readOnly
                  />
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mt-4 bg-blue-50 p-3 rounded border border-blue-200">
              Ces informations sont automatiquement remplies depuis votre profil client. 
              Pour les modifier, contactez votre gestionnaire de compte.
            </p>
          </div>
        </div>
        
        {/* Cart Summary Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Récapitulatif de votre demande</h2>
            </div>
            
            <div className="space-y-4">
              {items.map((item) => {
                const price = getProductPrice(item.product, item.selectedOptions);
                return (
                  <div key={item.product.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                      <img 
                        src={item.product.image_url || '/placeholder.svg'} 
                        alt={item.product.name}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product.name}</h3>
                      <p className="text-sm text-gray-500">
                        {item.product.brand && `${item.product.brand} • `}
                        Quantité: {item.quantity} • Durée: {item.duration} mois
                      </p>
                      
                      {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
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
                      <p className="font-medium text-blue-600">
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
                <Euro className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Total mensuel</span>
              </div>
              <span className="font-bold text-blue-600 text-xl">
                {formatCurrency(cartTotal)}
              </span>
            </div>
            
            <p className="text-sm text-gray-500 mt-2">
              Prix HT • Engagement sur 36 mois
            </p>
          </div>
        </div>
        
        {/* Message Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="text-sm text-gray-600">
                <p>En validant cette demande, vous acceptez que nous traitions votre demande et vous recontactions sous peu.</p>
              </div>
              
              <Button 
                type="submit" 
                size="lg"
                disabled={isSubmitting || items.length === 0}
                className="w-full sm:w-auto min-w-[200px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Envoyer ma demande
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ClientProductRequestForm;