import React, { useState } from 'react';
import { ChevronRight, CircleCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompanyInfoForm from '@/components/checkout/CompanyInfoForm';
import ContactInfoForm from '@/components/checkout/ContactInfoForm';
import RequestSummary from '@/components/checkout/RequestSummary';

interface InlineRequestStepsProps {
  companyId?: string;
  onBackToCart: () => void;
  onRequestCompleted: () => void;
}

const InlineRequestSteps: React.FC<InlineRequestStepsProps> = ({ 
  companyId, 
  onBackToCart, 
  onRequestCompleted 
}) => {
  const [step, setStep] = useState(1);
  
  const [companyFormData, setCompanyFormData] = useState({
    company: '',
    vat_number: '',
    company_verified: false,
    is_vat_exempt: false,
    country: 'BE',
    email: '',
    address: '',
    city: '',
    postal_code: ''
  });
  
  const [contactFormData, setContactFormData] = useState({
    name: '',
    phone: '',
    email: '',
    has_client_account: false,
    address: '',
    city: '',
    postal_code: '',
    country: '',
    has_different_shipping_address: false,
    shipping_address: '',
    shipping_city: '',
    shipping_postal_code: '',
    shipping_country: ''
  });
  
  const handleCompanyDataUpdate = (data: Partial<typeof companyFormData>) => {
    setCompanyFormData(prev => ({ ...prev, ...data }));
  };
  
  const handleContactDataUpdate = (data: Partial<typeof contactFormData>) => {
    setContactFormData(prev => ({ ...prev, ...data }));
  };
  
  const handleNextStep = () => {
    if (step === 1) {
      // When moving from company to contact step, pre-fill the address fields in contactFormData
      handleContactDataUpdate({
        address: companyFormData.address || '',
        city: companyFormData.city || '',
        postal_code: companyFormData.postal_code || '',
        country: companyFormData.country || ''
      });
    }
    setStep(prev => prev + 1);
  };
  
  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSummaryBack = () => {
    if (step > 1) {
      handlePrevStep();
    } else {
      onBackToCart();
    }
  };
  
  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Finaliser ma demande</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBackToCart}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au panier
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center rounded-full w-8 h-8 ${step > 1 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              {step > 1 ? (
                <CircleCheck className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">1</span>
              )}
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${step > 1 ? 'bg-green-400' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center rounded-full w-8 h-8 ${step > 2 ? 'bg-green-100 text-green-600' : step === 2 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              {step > 2 ? (
                <CircleCheck className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">2</span>
              )}
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${step > 2 ? 'bg-green-400' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center rounded-full w-8 h-8 ${step === 3 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              <span className="text-sm font-medium">3</span>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <div className={`w-1/3 text-center ${step === 1 ? 'font-medium text-blue-600' : step > 1 ? 'text-green-600' : ''}`}>Entreprise</div>
            <div className={`w-1/3 text-center ${step === 2 ? 'font-medium text-blue-600' : step > 2 ? 'text-green-600' : ''}`}>Contact</div>
            <div className={`w-1/3 text-center ${step === 3 ? 'font-medium text-blue-600' : ''}`}>Récapitulatif</div>
          </div>
        </div>
        
        <div className="min-h-[400px]">
          {step === 1 && (
            <CompanyInfoForm 
              formData={companyFormData} 
              updateFormData={handleCompanyDataUpdate}
              onNext={handleNextStep}
            />
          )}
          
          {step === 2 && (
            <ContactInfoForm
              formData={contactFormData}
              updateFormData={handleContactDataUpdate}
              onNext={handleNextStep}
              onBack={handlePrevStep}
              initialEmail={companyFormData.email}
            />
          )}
          
          {step === 3 && (
            <RequestSummary
              companyData={companyFormData}
              contactData={contactFormData}
              onBack={handleSummaryBack}
              companyId={companyId}
              onRequestCompleted={onRequestCompleted}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InlineRequestSteps;