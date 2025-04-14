
import React from 'react';
import { ClientCartProvider } from '@/context/ClientCartContext';

export const ClientCartAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ClientCartProvider>
      {children}
    </ClientCartProvider>
  );
};

export default ClientCartAppProvider;
