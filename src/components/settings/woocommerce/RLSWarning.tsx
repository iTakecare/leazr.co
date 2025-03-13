
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RLSWarningProps {
  hasRLSPermissions: boolean;
}

const RLSWarning: React.FC<RLSWarningProps> = ({ hasRLSPermissions }) => {
  if (hasRLSPermissions) return null;
  
  return (
    <Alert className="bg-orange-50 border-orange-200">
      <AlertCircle className="h-5 w-5 text-orange-600" />
      <AlertDescription>
        <p className="font-medium text-orange-800">
          Permissions d&apos;accès limitées
        </p>
        <p className="text-sm text-orange-700 mt-1">
          Il semble que vous n&apos;ayez pas les permissions nécessaires pour ajouter des produits directement. 
          L&apos;option &quot;Contourner la sécurité RLS&quot; a été activée automatiquement pour vous permettre d&apos;importer des produits.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default RLSWarning;
