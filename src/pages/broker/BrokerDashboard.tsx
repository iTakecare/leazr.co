import React from 'react';
import { useBrokerContext } from '@/context/BrokerContext';
import CompanyDashboard from '@/components/dashboard/CompanyDashboard';

const BrokerDashboard: React.FC = () => {
  const { brokerId } = useBrokerContext();

  if (!brokerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Le dashboard existant utilise déjà company_id via multiTenantService
  // Donc il fonctionnera automatiquement pour les brokers
  return <CompanyDashboard />;
};

export default BrokerDashboard;
