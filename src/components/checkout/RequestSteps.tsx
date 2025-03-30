
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import CompanyInfoForm from './CompanyInfoForm';
import ContactInfoForm from './ContactInfoForm';
import RequestSummary from './RequestSummary';
import { createProductRequest } from '@/services/requestInfoService';
import { formatCurrency } from '@/utils/formatters';

type Step = 'company' | 'contact' | 'summary';

const RequestSteps: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('company');
  const [formData, setFormData] = useState({
    company: '',
    vat_number: '',
    company_verified: false,
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const { items, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep === 'company') setCurrentStep('contact');
    else if (currentStep === 'contact') setCurrentStep('summary');
  };

  const prevStep = () => {
    if (currentStep === 'contact') setCurrentStep('company');
    else if (currentStep === 'summary') setCurrentStep('contact');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error("Veuillez ajouter des produits à votre panier avant de soumettre votre demande.");
      return;
    }

    setLoading(true);

    try {
      // Create a description of the cart items
      const equipmentDescription = items.map(item => 
        `${item.quantity}x ${item.product.name} (${formatCurrency(item.product.monthly_price)}/mois)`
      ).join('\n');

      const requestData = {
        client_name: formData.name,
        client_email: formData.email,
        client_company: formData.company,
        client_contact_email: formData.email,
        equipment_description: equipmentDescription,
        message: formData.message,
        amount: cartTotal,
        monthly_payment: cartTotal,
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        duration: 36 // Default duration in months
      };

      console.log("Submitting request with data:", requestData);

      // Submit the request - avec un délai pour éviter les erreurs de limitation de débit
      setTimeout(async () => {
        try {
          const result = await createProductRequest(requestData);
          
          if (!result) {
            throw new Error("Erreur lors de la création de la demande");
          }
          
          // Success! Clear cart and redirect
          clearCart();
          navigate('/demande-envoyee', { 
            state: { 
              success: true, 
              companyName: formData.company,
              name: formData.name
            } 
          });
        } catch (innerError) {
          console.error("Error in delayed submit:", innerError);
          toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
          setLoading(false);
        }
      }, 500);

    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress steps indicator */}
      <div className="mb-8">
        <ol className="flex items-center w-full">
          <li className={`flex items-center ${currentStep === 'company' ? 'text-blue-600 font-medium' : 'text-gray-500'} `}>
            <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'company' ? 'bg-blue-100 text-blue-600' : currentStep === 'contact' || currentStep === 'summary' ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
              {currentStep === 'contact' || currentStep === 'summary' ? <Check className="w-4 h-4" /> : '1'}
            </span>
            <span className="ml-2">Entreprise</span>
            <div className="flex items-center ml-5 sm:ml-8">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </li>
          
          <li className={`flex items-center ${currentStep === 'contact' ? 'text-blue-600 font-medium' : 'text-gray-500'} ml-5 sm:ml-8`}>
            <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'contact' ? 'bg-blue-100 text-blue-600' : currentStep === 'summary' ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
              {currentStep === 'summary' ? <Check className="w-4 h-4" /> : '2'}
            </span>
            <span className="ml-2">Contact</span>
            <div className="flex items-center ml-5 sm:ml-8">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </li>
          
          <li className={`flex items-center ${currentStep === 'summary' ? 'text-blue-600 font-medium' : 'text-gray-500'} ml-5 sm:ml-8`}>
            <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'summary' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>
              3
            </span>
            <span className="ml-2">Récapitulatif</span>
          </li>
        </ol>
      </div>

      {/* Form steps */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        {currentStep === 'company' && (
          <CompanyInfoForm 
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
          />
        )}

        {currentStep === 'contact' && (
          <ContactInfoForm
            formData={formData}
            updateFormData={updateFormData}
            onPrev={prevStep}
            onNext={nextStep}
          />
        )}

        {currentStep === 'summary' && (
          <RequestSummary
            formData={formData}
            cartItems={items}
            cartTotal={cartTotal}
            loading={loading}
            onPrev={prevStep}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
};

export default RequestSteps;
