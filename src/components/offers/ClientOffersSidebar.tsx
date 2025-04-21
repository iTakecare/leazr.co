
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { File, FileSignature, Menu, X } from 'lucide-react';
import { useClientOffers } from '@/hooks/useClientOffers';
import { Button } from '@/components/ui/button';

interface ClientOffersSidebarProps {
  currentOfferId: string;
  clientEmail?: string;
}

const ClientOffersSidebar: React.FC<ClientOffersSidebarProps> = ({ 
  currentOfferId,
  clientEmail = ''
}) => {
  const navigate = useNavigate();
  const { offers, loading, error } = useClientOffers(clientEmail);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  const toggleMobileSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };
  
  return (
    <>
      {/* Mobile Menu Button - Only visible on small screens */}
      <div className="fixed top-4 left-4 z-20 md:hidden">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleMobileSidebar}
          className="rounded-full bg-white shadow-md"
        >
          {showMobileSidebar ? <X size={18} /> : <Menu size={18} />}
        </Button>
      </div>
      
      {/* Sidebar - Fixed on mobile with animation, normal on desktop */}
      <div className={`w-64 min-h-screen bg-slate-50 border-r border-slate-200 p-4 flex flex-col 
        md:relative fixed left-0 top-0 z-10 transform transition-transform duration-300 ease-in-out
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
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
                        setShowMobileSidebar(false); // Close mobile sidebar after navigation
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
                        {offer.equipment_data && offer.equipment_data.length > 0 && offer.equipment_data[0]?.title 
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
        
        {/* Mobile Close Button - Bottom of sidebar */}
        <div className="mt-4 md:hidden">
          <Button 
            variant="outline"
            className="w-full"
            onClick={() => setShowMobileSidebar(false)}
          >
            Fermer
          </Button>
        </div>
      </div>
      
      {/* Overlay to close sidebar on mobile */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black/20 z-5 md:hidden" 
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
    </>
  );
};

export default ClientOffersSidebar;
