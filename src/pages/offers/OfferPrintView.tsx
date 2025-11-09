import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CommercialOffer from '@/components/offers/CommercialOffer';
import { useOfferDetail } from '@/hooks/offers/useOfferDetail';
import { toast } from 'sonner';

const OfferPrintView: React.FC = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { offer, loading, error } = useOfferDetail(offerId || '');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">Chargement de l'offre...</span>
      </div>
    );
  }

  if (error || !offer) {
    toast.error("Erreur lors du chargement de l'offre");
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error || "Offre introuvable"}</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  // Mapper les données de l'offre vers les props du composant
  const equipmentData = offer.parsedEquipment?.map((item: any) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    monthlyPayment: item.monthlyPayment,
    imageUrl: item.imageUrl || item.image_url || null,
    attributes: item.attributes || {},
    specifications: item.specifications || {},
  })) || [];

  const totalMonthly = equipmentData.reduce(
    (sum: number, item: any) => sum + (item.monthlyPayment * item.quantity),
    0
  );

  return (
    <div>
      {/* Bouton de retour - masqué à l'impression */}
      <div className="no-print fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="bg-white shadow-lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>

      {/* Composant d'offre */}
      <CommercialOffer
        offerNumber={offer.reference || offer.id}
        offerDate={new Date(offer.created_at).toLocaleDateString('fr-FR')}
        clientName={offer.client_name}
        clientEmail={offer.client_email}
        clientPhone={offer.client_phone}
        clientCompany={offer.clients?.company || ''}
        validityDays={10}
        equipment={equipmentData}
        totalMonthly={totalMonthly}
        contractDuration={offer.contract_duration || 36}
        fileFee={offer.file_fee || 0}
        insuranceCost={offer.insurance_cost || 0}
        companyValues={offer.companies?.values || []}
        metrics={[
          { label: 'De clients satisfaits', value: '99.30%' },
          { label: 'Appareils pris en charge', value: '710' },
          { label: 'Tonnes CO2e économisées', value: '91,03' },
        ]}
      />
    </div>
  );
};

export default OfferPrintView;
