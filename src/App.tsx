
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SignupPage from './pages/SignupPage';
import Settings from './pages/Settings';
import Offers from './pages/Offers';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/layout/Layout';
import Clients from './pages/Clients';
import PartnersListPage from './pages/PartnersList';
import AmbassadorsListPage from './pages/AmbassadorsList';
import CatalogManagement from './pages/CatalogManagement';
import Contracts from './pages/Contracts';
import OfferDetail from './pages/OfferDetail';
import CreateOffer from './pages/CreateOffer';
import ClientDetail from './pages/ClientDetail';
import PartnerDetail from './pages/PartnerDetail';
import AmbassadorDetail from './pages/AmbassadorDetail';
import PaymentPage from './pages/PaymentPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LeazrClients from "@/pages/LeazrClients";
import HomePage from './pages/HomePage';

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <Toaster />
          <QueryClientProvider client={queryClient}>
            <Routes>
              {/* Route par défaut vers la landing page */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              
              {/* Admin routes */}
              <Route path="/dashboard" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <Dashboard />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <Settings />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/offers" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <Offers />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/offers/:id" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <OfferDetail />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/offers/create" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <CreateOffer />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/clients" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <Clients />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/clients/:id" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <ClientDetail />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/partners" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <PartnersListPage />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/partners/:id" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <PartnerDetail />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/ambassadors" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <AmbassadorsListPage />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/ambassadors/:id" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <AmbassadorDetail />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/catalog" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <CatalogManagement />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/contracts" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <Contracts />
                  </Layout>
                </PrivateRoute>
              } />
              
              {/* Client routes */}
              <Route path="/client/dashboard" element={
                <PrivateRoute requiredRole="client">
                  <Layout>
                    <div>Client Dashboard</div>
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/client/settings" element={
                <PrivateRoute requiredRole="client">
                  <Layout>
                    <div>Client Settings</div>
                  </Layout>
                </PrivateRoute>
              } />
              
              {/* Partner routes */}
              <Route path="/partner/dashboard" element={
                <PrivateRoute requiredRole="partner">
                  <Layout>
                    <div>Partner Dashboard</div>
                  </Layout>
                </PrivateRoute>
              } />
              
              {/* Ambassador routes */}
              <Route path="/ambassador/dashboard" element={
                <PrivateRoute requiredRole="ambassador">
                  <Layout>
                    <div>Ambassador Dashboard</div>
                  </Layout>
                </PrivateRoute>
              } />
              
              {/* Leazr Clients route */}
              <Route path="/leazr-clients" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <LeazrClients />
                  </Layout>
                </PrivateRoute>
              } />
            </Routes>
          </QueryClientProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
