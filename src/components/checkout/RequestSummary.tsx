
import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ChevronLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/utils/formatters';

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
  };
  onBack: () => void;
}

const RequestSummary: React.FC<RequestSummaryProps> = ({ companyData, contactData, onBack }) => {
  const { items } = useCart();
  
  // Calculate totals without using CartContext methods
  const totalMonthly = items.reduce((total, item) => {
    const price = item.product.currentPrice || item.product.monthly_price || 0;
    return total + (price * item.quantity);
  }, 0);
  
  const totalValue = items.reduce((total, item) => {
    const price = item.product.currentPrice || item.product.monthly_price || 0;
    const months = item.duration || 36;
    return total + (price * item.quantity * months);
  }, 0);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    window.location.href = '/request-sent';
  };
  
  // Use the email from contactData if available, otherwise use the company email
  const contactEmail = contactData.email || companyData.email;

  // Fonction pour traduire le code pays
  const getCountryName = (countryCode: string): string => {
    switch(countryCode) {
      case 'BE': return 'Belgique';
      case 'FR': return 'France';
      case 'LU': return 'Luxembourg';
      default: return countryCode;
    }
  };

  // Fonction pour obtenir le label du numéro d'identification approprié
  const getIdLabel = (countryCode: string): string => {
    switch(countryCode) {
      case 'BE': return 'Numéro TVA';
      case 'FR': return 'SIRET';
      case 'LU': return 'RCS';
      default: return 'Numéro d\'identification';
    }
  };

  // Fonction pour formater une adresse
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
                    <p className="font-medium">{formatCurrency(item.product.monthly_price)} / mois</p>
                    <p className="text-sm text-gray-600">Quantité: {item.quantity}</p>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-2 flex justify-between text-sm">
              <span className="font-medium">Total mensuel:</span>
              <span className="font-bold text-blue-700">{formatCurrency(totalMonthly)} / mois</span>
            </div>
            
            <div className="pt-1 flex justify-between text-sm">
              <span className="font-medium">Valeur totale (36 mois):</span>
              <span>{formatCurrency(totalValue)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex items-center"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Retour
        </Button>
        
        <Button 
          type="submit"
          className="bg-green-600 hover:bg-green-700"
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Envoyer ma demande
        </Button>
      </div>
    </form>
  );
};

export default RequestSummary;
