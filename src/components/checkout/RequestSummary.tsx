
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createProductRequest } from '@/services/requestInfoService';

interface SummaryProps {
  companyData: {
    company: string;
    vat_number: string;
    country: string;
    email?: string;
  };
  contactData: {
    name: string;
    phone: string;
    email?: string;
    has_client_account: boolean;
  };
  onBack: () => void;
}

const RequestSummary: React.FC<SummaryProps> = ({ companyData, contactData, onBack }) => {
  const navigate = useNavigate();
  const { items, calculateTotalMonthly, calculateTotalValue, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Map cart items to equipment description
      const equipmentDescription = items.map(item => 
        `${item.product.name} (${item.quantity} unité(s)) - Durée: ${item.duration} mois`
      ).join("; ");
      
      // Use the email from company data if available, otherwise from contact data
      const email = companyData.email || contactData.email || '';
      
      const requestData = {
        client_name: contactData.name,
        client_email: email,
        client_company: companyData.company,
        client_phone: contactData.phone,
        client_vat_number: companyData.vat_number,
        client_country: companyData.country,
        client_contact_email: email,
        equipment_description: equipmentDescription,
        message: "",
        amount: calculateTotalValue(),
        monthly_payment: calculateTotalMonthly(),
        quantity: items.reduce((total, item) => total + item.quantity, 0),
        duration: items[0]?.duration || 24, // Default to first item's duration
        wants_account: contactData.has_client_account,
      };
      
      const result = await createProductRequest(requestData);
      
      toast.success("Votre demande a été envoyée avec succès");
      clearCart();
      navigate("/demande-envoyee", {
        state: { 
          success: true, 
          companyName: companyData.company,
          name: contactData.name
        }
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de la demande:", error);
      toast.error("Une erreur est survenue lors de l'envoi de votre demande");
      setIsSubmitting(false);
    }
  };
  
  // Calculate total monthly cost and total items
  const totalMonthly = calculateTotalMonthly();
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Récapitulatif de votre demande</h2>
        <p className="text-gray-600">Vérifiez les informations ci-dessous avant de soumettre votre demande</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <h3 className="font-medium text-gray-800 mb-3">Informations de l'entreprise</h3>
          <div className="space-y-2 text-gray-600">
            <div>
              <span className="text-gray-500">Société:</span> {companyData.company}
            </div>
            <div>
              <span className="text-gray-500">Numéro d'entreprise:</span> {companyData.vat_number}
            </div>
            {companyData.email && (
              <div>
                <span className="text-gray-500">Email:</span> {companyData.email}
              </div>
            )}
            <div>
              <span className="text-gray-500">Pays:</span> {
                companyData.country === 'BE' ? 'Belgique' : 
                companyData.country === 'FR' ? 'France' : 
                companyData.country === 'LU' ? 'Luxembourg' : companyData.country
              }
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <h3 className="font-medium text-gray-800 mb-3">Informations de contact</h3>
          <div className="space-y-2 text-gray-600">
            <div>
              <span className="text-gray-500">Nom:</span> {contactData.name}
            </div>
            {contactData.email && companyData.email !== contactData.email && (
              <div>
                <span className="text-gray-500">Email:</span> {contactData.email}
              </div>
            )}
            {contactData.phone && (
              <div>
                <span className="text-gray-500">Téléphone:</span> {contactData.phone}
              </div>
            )}
            {contactData.has_client_account && (
              <div className="flex items-center text-blue-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                <span>Création d'un compte client</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h3 className="font-medium text-gray-800 mb-3">Produits ({totalItems})</h3>
        <div className="divide-y divide-blue-100">
          {items.map((item, index) => (
            <div key={index} className="py-3 flex justify-between">
              <div>
                <div className="font-medium">{item.product.name}</div>
                <div className="text-sm text-gray-600">
                  Quantité: {item.quantity} × {item.duration} mois
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-blue-700">
                  {formatCurrency(item.product.monthly_price * item.quantity)} HT / mois
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-blue-200 flex justify-between items-center">
          <div className="font-medium text-gray-800">Total mensuel:</div>
          <div className="text-xl font-bold text-blue-700">
            {formatCurrency(totalMonthly)} HT / mois
          </div>
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour
        </Button>
        
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
        </Button>
      </div>
    </div>
  );
};

export default RequestSummary;
