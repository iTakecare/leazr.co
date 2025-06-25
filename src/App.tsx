
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { CompanyBrandingProvider } from './context/CompanyBrandingContext';
import MultiTenantRouter from './components/layout/MultiTenantRouter';

function App() {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    document.title = "Leazr - Votre solution de leasing";
  }, []);

  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CompanyBrandingProvider>
            <Toaster />
            <MultiTenantRouter />
          </CompanyBrandingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
