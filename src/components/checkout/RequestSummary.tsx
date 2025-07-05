import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ChevronLeft, InfoIcon } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import { createProductRequest } from '@/services/requestInfoService';
import { useToast } from '@/hooks/use-toast';
import { getProductPrice } from '@/utils/productPricing';
import { findCoefficientForAmount } from '@/utils/equipmentCalculations';
import { defaultLeasers } from '@/data/leasers';

interface RequestSummaryProps {
  companyData: {
    company: string;
    vat_number: string;
    company_verified: boolean;
    is_vat_exempt: boolean;
    country: string;
    email: string;
  };
  contactData: {
    name: string;
    phone: string;
    has_client_account: boolean;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    has_different_shipping_address?: boolean;
    shipping_address?: string;
    shipping_city?: string;
    shipping_postal_code?: string;
    shipping_country?: string;
    email?: string;
  };
  onBack: () => void;
  companyId?: string;
}

const RequestSummary: React.FC<RequestSummaryProps> = ({ companyData, contactData, onBack, companyId }) => {
  const { items, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Utiliser la logique centralisée pour obtenir les prix corrects
  const totalPurchaseAmount = items.reduce((total, item) => {
    const priceData = getProductPrice(item.product, item.selectedOptions);
    return total + (priceData.purchasePrice * item.quantity);
  }, 0);
  
  // Calculer le total des mensualités avec la logique centralisée
  const totalMonthly = items.reduce((total, item) => {
    const priceData = getProductPrice(item.product, item.selectedOptions);
    return total + (priceData.monthlyPrice * item.quantity);
  }, 0);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const equipmentDescription = items.map(item => {
        const options = Object.entries(item.selectedOptions || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        
        // Utiliser la logique centralisée pour obtenir les prix corrects
        const priceData = getProductPrice(item.product, item.selectedOptions);
        
        console.log(`RequestSummary: Product ${item.product.name} - Purchase: ${priceData.purchasePrice}, Monthly: ${priceData.monthlyPrice}`);
          
        return `${item.product.name} - Prix: ${formatCurrency(priceData.purchasePrice)} (${formatCurrency(priceData.monthlyPrice)}/mois) x ${item.quantity}${options ? ` - Options: ${options}` : ''}`;
      }).join('\n');
      
      let formattedPhone = contactData.phone || '';
      formattedPhone = formattedPhone.replace(/^\+(\d+)\s0/, '+$1 ');
      
      // Utiliser la logique du calculateur pour les calculs financiers corrects
      const defaultMargin = 82; // Marge par défaut de 82% comme dans le calculateur
      const financedAmount = totalPurchaseAmount * (1 + defaultMargin / 100); // Montant financé = Prix d'achat × (1 + marge/100)
      const coefficient = findCoefficientForAmount(financedAmount, defaultLeasers[0]); // Trouver le coefficient basé sur le montant financé
      const calculatedMonthlyPayment = (financedAmount * coefficient) / 100; // Mensualité = Montant financé × coefficient ÷ 100
      const marginAmount = financedAmount - totalPurchaseAmount; // Marge = Montant financé - Prix d'achat
      const marginPercentage = totalPurchaseAmount > 0 ? (marginAmount / totalPurchaseAmount) * 100 : 0;
      
      const requestData = {
        company_id: companyId,
        client_name: companyData.company,
        client_email: companyData.email,
        client_company: companyData.company,
        client_vat_number: companyData.vat_number,
        client_is_vat_exempt: companyData.is_vat_exempt || false,
        client_country: companyData.country,
        client_contact_email: contactData.email || companyData.email,
        phone: formattedPhone,
        address: contactData.address || '',
        city: contactData.city || '',
        postal_code: contactData.postal_code || '',
        country: contactData.country || 'BE',
        has_different_shipping_address: contactData.has_different_shipping_address || false,
        shipping_address: contactData.shipping_address || '',
        shipping_city: contactData.shipping_city || '',
        shipping_postal_code: contactData.shipping_postal_code || '',
        shipping_country: contactData.shipping_country || '',
        equipment_description: equipmentDescription,
        amount: totalPurchaseAmount, // Prix d'achat total correct
        monthly_payment: calculatedMonthlyPayment, // Mensualité calculée avec la logique du calculateur
        coefficient: coefficient, // Coefficient calculé correctement
        financed_amount: financedAmount, // Montant financé correct
        margin: defaultMargin, // Marge en pourcentage
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        duration: 36, // Durée fixe de 36 mois
        has_client_account: contactData.has_client_account,
        message: `Financement demandé pour ${formatCurrency(financedAmount)} avec une marge de ${formatCurrency(marginAmount)} (${defaultMargin}%)`
      };

      console.log("Submitting request with data:", requestData);
      
      const result = await createProductRequest(requestData);
      
      clearCart();
      
      navigate('/demande-envoyee', { 
        state: { 
          success: true, 
          companyName: companyData.company, 
          name: contactData.name 
        }
      });
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer."
      });
      setIsSubmitting(false);
    }
  };
  
  const contactEmail = contactData.email || companyData.email;

  const getCountryName = (countryCode: string): string => {
    switch(countryCode) {
      case 'BE': return 'Belgique';
      case 'FR': return 'France';
      case 'LU': return 'Luxembourg';
      default: return countryCode;
    }
  };

  const getIdLabel = (countryCode: string): string => {
    switch(countryCode) {
      case 'BE': return 'Numéro TVA';
      case 'FR': return 'SIRET';
      case 'LU': return 'RCS';
      default: return 'Numéro d\'identification';
    }
  };

  const formatAddress = (
    address?: string,
    city?: string,
    postal_code?: string,
    country?: string
  ) => {
    if (!address && !city && !postal_code && !country) return "Non spécifiée";
    
    const parts = [];
    if (address) parts.push(address);
    
    const cityPart = [];
    if (postal_code) cityPart.push(postal_code);
    if (city) cityPart.push(city);
    if (cityPart.length > 0) parts.push(cityPart.join(' '));
    
    if (country) parts.push(country);
    
    return parts.join(', ');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Récapitulatif de votre demande</h2>
        <p className="text-gray-600">Veuillez vérifier les informations ci-dessous avant de valider</p>
      </div>
      
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium mb-2">Informations entreprise</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-500">Entreprise:</span> {companyData.company}</p>
            <p><span className="text-gray-500">{getIdLabel(companyData.country)}:</span> {companyData.vat_number}</p>
            <p><span className="text-gray-500">Pays:</span> {getCountryName(companyData.country)}</p>
            <p><span className="text-gray-500">Email:</span> {companyData.email}</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium mb-2">Informations de contact</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-500">Nom:</span> {contactData.name}</p>
            <p><span className="text-gray-500">Email:</span> {contactEmail}</p>
            {contactData.phone && (
              <p><span className="text-gray-500">Téléphone:</span> {contactData.phone}</p>
            )}
            <p><span className="text-gray-500">Adresse de facturation:</span> {formatAddress(
              contactData.address,
              contactData.city,
              contactData.postal_code,
              contactData.country
            )}</p>
            
            {contactData.has_different_shipping_address && (
              <p><span className="text-gray-500">Adresse de livraison:</span> {formatAddress(
                contactData.shipping_address,
                contactData.shipping_city,
                contactData.shipping_postal_code,
                contactData.shipping_country
              )}</p>
            )}
            
            <p><span className="text-gray-500">Compte client:</span> {contactData.has_client_account ? 'Oui' : 'Non'}</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium mb-2">Matériel demandé</h3>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <div className="text-sm text-gray-600">
                      {Object.entries(item.selectedOptions || {}).map(([key, value]) => (
                        <span key={key} className="mr-2">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                   <div className="text-right">
                     <p className="font-medium text-sm">Prix: {formatCurrency(getProductPrice(item.product, item.selectedOptions).purchasePrice)}</p>
                     <p className="font-medium">{formatCurrency(getProductPrice(item.product, item.selectedOptions).monthlyPrice)} / mois</p>
                     <p className="text-sm text-gray-600">Quantité: {item.quantity}</p>
                   </div>
                </div>
              </div>
            ))}
            
            <div className="pt-2 space-y-1 text-sm border-t border-gray-300">
              <div className="flex justify-between">
                <span className="font-medium">Total mensuel:</span>
                <span className="font-bold text-blue-700">{formatCurrency(totalMonthly)} / mois</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
          <div className="flex">
            <InfoIcon className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800 text-sm">
              Demande soumise à approbation d'un partenaire financier, nous reviendrons vers vous dans un délai de 24h (jours ouvrables, hors week-end) pour le suivi de votre demande.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex items-center"
          disabled={isSubmitting}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Retour
        </Button>
        
        <Button 
          type="submit"
          className="bg-green-600 hover:bg-green-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Envoi en cours...
            </>
          ) : (
            <>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Envoyer ma demande
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default RequestSummary;
