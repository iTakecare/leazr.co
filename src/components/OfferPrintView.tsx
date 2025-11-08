import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CommercialOffer from '@/components/offers/CommercialOffer';

const OfferPrintView: React.FC = () => {
  const [searchParams] = useSearchParams();

  const offerData = {
    offerNumber: searchParams.get('offerNumber') || '',
    offerDate: searchParams.get('offerDate') || '',
    clientName: searchParams.get('clientName') || '',
    clientEmail: searchParams.get('clientEmail') || '',
    clientPhone: searchParams.get('clientPhone') || '',
  };

  // Auto-print après chargement
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ background: 'white', minHeight: '100vh', padding: 0 }}>
      {/* Masquer le bouton de téléchargement du composant CommercialOffer */}
      <style>{`
        .print-button-container { 
          display: none !important; 
        }
      `}</style>
      <CommercialOffer {...offerData} />
    </div>
  );
};

export default OfferPrintView;
