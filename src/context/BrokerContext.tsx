import React, { createContext, useContext } from 'react';
import { Broker, BrokerContextType } from '@/types/broker';

const BrokerContext = createContext<BrokerContextType | undefined>(undefined);

export { BrokerContext };

interface BrokerProviderProps {
  children: React.ReactNode;
  broker: Broker | null;
  loading: boolean;
  refresh: () => void;
}

export const BrokerProvider: React.FC<BrokerProviderProps> = ({ 
  children, 
  broker, 
  loading,
  refresh 
}) => {
  const value: BrokerContextType = {
    broker,
    brokerId: broker?.id || null,
    brokerSlug: broker?.slug || null,
    loading,
    refresh,
  };

  return (
    <BrokerContext.Provider value={value}>
      {children}
    </BrokerContext.Provider>
  );
};

export const useBrokerContext = () => {
  const context = useContext(BrokerContext);
  if (context === undefined) {
    throw new Error('useBrokerContext must be used within a BrokerProvider');
  }
  return context;
};
