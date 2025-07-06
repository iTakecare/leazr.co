import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CustomOfferGenerator from '@/components/offer/CustomOfferGenerator';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CustomOfferGeneratorPage: React.FC = () => {
  const navigate = useNavigate();

  const handleOfferComplete = (offerId: string) => {
    toast.success('Offre générée avec succès !');
    // Redirect to offer detail page
    navigate(`/admin/offers/${offerId}`);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <CustomOfferGenerator 
          onComplete={handleOfferComplete}
          className="container mx-auto"
        />
      </div>
    </div>
  );
};

export default CustomOfferGeneratorPage;