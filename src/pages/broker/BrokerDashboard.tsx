import React from 'react';
import WaveLoader from "@/components/ui/WaveLoader";
import { useBrokerContext } from '@/context/BrokerContext';
import CompanyDashboard from '@/components/dashboard/CompanyDashboard';

const BrokerDashboard: React.FC = () => {
  const { brokerId } = useBrokerContext();

  if (!brokerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <WaveLoader />
      </div>
    );
  }

  // Le dashboard existant utilise déjà company_id via multiTenantService
  // Donc il fonctionnera automatiquement pour les brokers
  return <CompanyDashboard />;
};

export default BrokerDashboard;
