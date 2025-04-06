
import React from 'react';
import PartnerCommissionsTable from '@/components/partners/PartnerCommissionsTable';

interface CommissionsViewProps {
  isOpen: boolean;
  onClose: () => void;
  owner: {
    id: string;
    name: string;
    type: 'partner' | 'ambassador';
  };
  commissions?: any[]; // Ajout du prop optionnel commissions
}

const CommissionsView: React.FC<CommissionsViewProps> = ({ isOpen, onClose, owner, commissions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Commissions - {owner.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        
        <div className="p-4 overflow-auto flex-grow">
          {owner.type === 'partner' ? (
            <PartnerCommissionsTable partnerId={owner.id} />
          ) : (
            <div className="p-4 text-center">
              <p className="text-gray-500">Commissions ambassadeur en cours de développement</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommissionsView;
