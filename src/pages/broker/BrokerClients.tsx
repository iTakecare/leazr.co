import React from 'react';
import Clients from '@/pages/Clients';

const BrokerClients: React.FC = () => {
  // Réutilisation directe car le filtrage se fait via company_id
  return <Clients />;
};

export default BrokerClients;
