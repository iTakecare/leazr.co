
import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface RLSWarningProps {
  hasRLSPermissions: boolean;
}

const RLSWarning: React.FC<RLSWarningProps> = ({ hasRLSPermissions }) => {
  if (hasRLSPermissions) return null;
  
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">Problème de permissions détecté</h3>
          <p className="text-sm text-amber-700 mt-1">
            Votre compte n&apos;a pas les permissions nécessaires pour ajouter des produits. 
            L&apos;option &quot;Contourner la sécurité RLS&quot; a été activée automatiquement pour tenter de résoudre ce problème.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RLSWarning;
