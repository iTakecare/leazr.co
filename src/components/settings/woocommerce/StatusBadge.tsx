
import React from 'react';
import { ImportStatus } from './types';

interface StatusBadgeProps {
  status: ImportStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'fetching':
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Récupération des produits</span>;
    case 'importing':
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Importation en cours</span>;
    case 'completed':
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Importation terminée</span>;
    case 'error':
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Erreur</span>;
    default:
      return null;
  }
};

export default StatusBadge;
