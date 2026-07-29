import React from 'react';
import { Outlet } from "react-router";
import { useFinanceurData } from '@/hooks/useFinanceurData';
import { FinanceurProvider } from '@/context/FinanceurContext';
import FinanceurSidebar from './FinanceurSidebar';

const FinanceurLayout: React.FC = () => {
  const { financeur, loading, refresh } = useFinanceurData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <FinanceurProvider financeur={financeur} loading={loading} refresh={refresh}>
      <div className="flex h-screen overflow-hidden bg-background">
        <FinanceurSidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </FinanceurProvider>
  );
};

export default FinanceurLayout;
