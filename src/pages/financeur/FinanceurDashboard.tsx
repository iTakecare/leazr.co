import React from 'react';
import WaveLoader from "@/components/ui/WaveLoader";
import { useFinanceurContext } from '@/context/FinanceurContext';
import CompanyDashboard from '@/components/dashboard/CompanyDashboard';

const FinanceurDashboard: React.FC = () => {
  const { financeurId } = useFinanceurContext();

  if (!financeurId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <WaveLoader />
      </div>
    );
  }

  // Le dashboard existant est scopé company_id via multiTenantService
  return <CompanyDashboard />;
};

export default FinanceurDashboard;
