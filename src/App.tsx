
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyBrandingProvider } from './context/CompanyBrandingContext';
import Dashboard from './pages/Dashboard';
import Offers from './pages/Offers';
import Clients from './pages/Clients';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import CreateOffer from './pages/CreateOffer';
import ContractDetail from './pages/ContractDetail';
import Contracts from './pages/Contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import OfferDetail from './pages/OfferDetail';
import OfferOnline from "@/pages/OfferOnline";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CompanyBrandingProvider>
            <Toaster />
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/offers"
                element={
                  <RequireAuth>
                    <Offers />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/offers"
                element={
                  <RequireAuth>
                    <Offers />
                  </RequireAuth>
                }
              />
              <Route
                path="/offers/:id"
                element={
                  <RequireAuth>
                    <OfferDetail />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/offers/:id"
                element={
                  <RequireAuth>
                    <OfferDetail />
                  </RequireAuth>
                }
              />
              <Route
                path="/clients"
                element={
                  <RequireAuth>
                    <Clients />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/clients"
                element={
                  <RequireAuth>
                    <Clients />
                  </RequireAuth>
                }
              />
              <Route
                path="/create-offer"
                element={
                  <RequireAuth>
                    <CreateOffer />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/create-offer"
                element={
                  <RequireAuth>
                    <CreateOffer />
                  </RequireAuth>
                }
              />
              <Route
                path="/contracts/:id"
                element={
                  <RequireAuth>
                    <ContractDetail />
                  </RequireAuth>
                }
              />
              <Route
                path="/contracts"
                element={
                  <RequireAuth>
                    <Contracts />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/contracts"
                element={
                  <RequireAuth>
                    <Contracts />
                  </RequireAuth>
                }
              />
              
              {/* Public offer viewing route */}
              <Route path="/offer/:id" element={<OfferOnline />} />
              
            </Routes>
          </CompanyBrandingProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

export default App;
