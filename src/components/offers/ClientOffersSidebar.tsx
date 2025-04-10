
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { File, FileSignature } from 'lucide-react';
import { useClientOffers } from '@/hooks/useClientOffers';

interface ClientOffersSidebarProps {
  currentOfferId: string;
  clientEmail: string;
}

const ClientOffersSidebar: React.FC<ClientOffersSidebarProps> = ({ 
  currentOfferId,
  clientEmail
}) => {
  const navigate = useNavigate();
  const { offers, loading, error } = useClientOffers(clientEmail);
  
  return (
    <div className="w-64 min-h-screen bg-slate-50 border-r border-slate-200 p-4 flex flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-medium text-slate-900 mb-1">Vos offres</h2>
        <p className="text-sm text-slate-500">
          Consultez et signez vos offres
        </p>
      </div>
      
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-slate-500">
            Chargement de vos offres...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-red-500">
            Impossible de charger vos offres
          </div>
        ) : offers && offers.length > 0 ? (
          <ul className="space-y-2">
            {offers.map(offer => (
              <li key={offer.id}>
                <button
                  className={`w-full p-3 text-left rounded-md flex items-start hover:bg-slate-100 transition-colors ${
                    offer.id === currentOfferId ? 'bg-slate-100 ring-1 ring-slate-200' : ''
                  }`}
                  onClick={() => {
                    if (offer.id !== currentOfferId) {
                      navigate(`/client/sign-offer/${offer.id}`);
                    }
                  }}
                >
                  <span className="mr-2 flex-shrink-0 mt-0.5">
                    {offer.workflow_status === 'approved' || offer.signature_data ? (
                      <FileSignature size={16} className="text-green-500" />
                    ) : (
                      <File size={16} className="text-blue-500" />
                    )}
                  </span>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-sm text-slate-800 truncate">
                      {offer.equipment_data && offer.equipment_data[0]?.title 
                        ? offer.equipment_data[0].title 
                        : 'Offre de financement'}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-1">
                      {offer.workflow_status === 'approved' || offer.signature_data
                        ? 'Signée'
                        : 'En attente de signature'}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center p-6 text-center">
            <File className="h-12 w-12 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">
              Aucune autre offre disponible
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientOffersSidebar;
