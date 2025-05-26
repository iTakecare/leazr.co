import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SignupPage from './pages/SignupPage';
import Settings from './pages/Settings';
import Offers from './pages/Offers';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/layout/Layout';
import Clients from './pages/Clients';
import PartnersListPage from './pages/PartnersList';
import AmbassadorsListPage from './pages/AmbassadorsList';
import Catalog from './pages/Catalog';
import Contracts from './pages/Contracts';
import OfferDetails from './pages/OfferDetails';
import CreateOffer from './pages/CreateOffer';
import EditOffer from './pages/EditOffer';
import ClientDetails from './pages/ClientDetails';
import CreateClient from './pages/CreateClient';
import EditClient from './pages/EditClient';
import PartnerDetails from './pages/PartnerDetails';
import CreatePartner from './pages/CreatePartner';
import EditPartner from './pages/EditPartner';
import AmbassadorDetails from './pages/AmbassadorDetails';
import CreateAmbassador from './pages/CreateAmbassador';
import EditAmbassador from './pages/EditAmbassador';
import PaymentPage from './pages/PaymentPage';
import { QueryClient } from '@tanstack/react-query';
import LeazrClients from "@/pages/LeazrClients";

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <Toaster />
          <QueryClient>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/" element={<Login />} />
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
                    <OfferDetails />
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
              <Route path="/offers/edit/:id" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <EditOffer />
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
                    <ClientDetails />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/clients/create" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <CreateClient />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/clients/edit/:id" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <EditClient />
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
                    <PartnerDetails />
                  </Layout>
                </PrivateRoute>
              } />
               <Route path="/partners/create" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <CreatePartner />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/partners/edit/:id" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <EditPartner />
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
                    <AmbassadorDetails />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/ambassadors/create" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <CreateAmbassador />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/ambassadors/edit/:id" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <EditAmbassador />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/catalog" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <Catalog />
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
          </QueryClient>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
