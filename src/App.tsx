import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Offers from './pages/Offers';
import Clients from './pages/Clients';
import Leasers from './pages/Leasers';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CreateOffer from './pages/CreateOffer';
import ContractDetail from './pages/ContractDetail';
import Contracts from './pages/Contracts';
import CommissionLevels from './pages/CommissionLevels';
import Ambassadors from './pages/Ambassadors';
import { QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import OfferDetail from './pages/OfferDetail';
import AmbassadorOffers from './pages/AmbassadorOffers';
import OfferOnline from "@/pages/OfferOnline";

function App() {
  return (
    <QueryClient>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
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
              path="/offers"
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
              path="/clients"
              element={
                <RequireAuth>
                  <Clients />
                </RequireAuth>
              }
            />
            <Route
              path="/leasers"
              element={
                <RequireAuth>
                  <Leasers />
                </RequireAuth>
              }
            />
            <Route
              path="/users"
              element={
                <RequireAuth>
                  <Users />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
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
              path="/commission-levels"
              element={
                <RequireAuth>
                  <CommissionLevels />
                </RequireAuth>
              }
            />
             <Route
              path="/ambassadors"
              element={
                <RequireAuth>
                  <Ambassadors />
                </RequireAuth>
              }
            />
            <Route
              path="/ambassador/offers/:id"
              element={
                <RequireAuth>
                  <OfferDetail />
                </RequireAuth>
              }
            />
             <Route
              path="/ambassador/offers"
              element={
                <RequireAuth>
                  <AmbassadorOffers />
                </RequireAuth>
              }
            />
            
            {/* Public offer viewing route */}
            <Route path="/offer/:id" element={<OfferOnline />} />
            
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClient>
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
