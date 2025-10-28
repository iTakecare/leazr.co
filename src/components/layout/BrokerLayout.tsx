import React from 'react';
import { Outlet } from 'react-router-dom';
import { useBrokerData } from '@/hooks/useBrokerData';
import { BrokerProvider } from '@/context/BrokerContext';
import BrokerSidebar from './BrokerSidebar';

const BrokerLayout: React.FC = () => {
  const { broker, loading, refresh } = useBrokerData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <BrokerProvider broker={broker} loading={loading} refresh={refresh}>
      <div className="flex h-screen overflow-hidden bg-background">
        <BrokerSidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </BrokerProvider>
  );
};

export default BrokerLayout;
