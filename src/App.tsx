import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Loader2 } from 'lucide-react';
import ClientRoutes from '@/components/layout/ClientRoutes';
import ClientDashboard from '@/pages/ClientDashboard';
import ClientContractsPage from '@/pages/ClientContractsPage';
import ClientCalculator from '@/pages/ClientCalculator';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import CommissionCalculator from '@/pages/CommissionCalculator';
import Dashboard from '@/pages/Dashboard';
import Offers from '@/pages/Offers';
import OfferDetail from '@/pages/OfferDetail';
import CreateOffer from '@/pages/CreateOffer';
import Contracts from '@/pages/Contracts';
import ContractDetail from '@/pages/ContractDetail';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Partners from '@/pages/Partners';
import PartnerDetail from '@/pages/PartnerDetail';
import PartnerCreate from '@/pages/PartnerCreatePage';
import PartnerEdit from '@/pages/PartnerEditPage';
import AmbassadorsList from '@/pages/AmbassadorsList';
import AmbassadorDetail from '@/pages/AmbassadorDetail';
import AmbassadorCreate from '@/pages/AmbassadorCreatePage';
import AmbassadorEdit from '@/pages/AmbassadorEditPage';
import PartnerDashboard from '@/pages/PartnerDashboard';
import PartnerOffers from '@/pages/PartnerOffersList';
import PartnerOfferDetail from '@/pages/PartnerOfferDetail';
import PartnerCreateOffer from '@/pages/PartnerCreateOffer';
import AmbassadorDashboard from '@/pages/AmbassadorDashboard';
import AmbassadorOffers from '@/pages/AmbassadorOffersList';
import AmbassadorOfferDetail from '@/pages/AmbassadorOfferDetail';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import ClientCreate from '@/pages/ClientCreatePage';
import ClientEdit from '@/pages/ClientEditPage';
import RequestInfos from '@/pages/RequestInfosList';
import RequestInfoDetail from '@/pages/RequestInfoDetail';
import Catalog from '@/pages/Catalog';
import CatalogCreate from '@/pages/CatalogCreatePage';
import CatalogEdit from '@/pages/CatalogEditPage';
import Login from '@/pages/Login';
import Register from '@/pages/Signup';
import ForgotPassword from '@/pages/ForgotPasswordPage';
import ResetPassword from '@/pages/ResetPasswordPage';
import EmailConfirmation from '@/pages/EmailConfirmationPage';
import Pricing from '@/pages/PricingPage';
import Contact from '@/pages/ContactPage';
import Legal from '@/pages/LegalPage';
import NotFound from '@/pages/NotFound';

const Loader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="client-layout">
      {children}
    </div>
  );
};

const ProtectedRoute = ({ isAllowed, children, loading }: { isAllowed: boolean; children: React.ReactNode; loading: boolean }) => {
  if (loading) {
    return <Loader />;
  }
  if (!isAllowed) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

const ClientProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isClient, isLoading } = useAuth();

  if (isLoading) {
    return <Loader />;
  }

  if (!isClient) {
    return <Navigate to="/" />;
  }

  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
};

const Router = () => {
  const { user, isLoading } = useAuth();
  
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isPartner = user?.role === 'partner';
  const isAmbassador = user?.role === 'ambassador';
  const isClient = user?.role === 'client';
  
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          
          <Route path="/client/dashboard" element={
            <ClientProtectedRoute>
              <ClientDashboard />
            </ClientProtectedRoute>
          } />
          <Route path="/client/contracts" element={
            <ClientProtectedRoute>
              <ClientContractsPage />
            </ClientProtectedRoute>
          } />
          <Route path="/client/calculator" element={
            <ClientProtectedRoute>
              <ClientCalculator />
            </ClientProtectedRoute>
          } />
          
          <Route path="/" element={<ProtectedRoute isAllowed={isAuthenticated} loading={isLoading}><Outlet /></ProtectedRoute>}>
            <Route element={<Layout />}>
              {isAdmin && (
                <>
                  <Route path="/admin/dashboard" element={<Dashboard />} />
                  
                  <Route path="/offers" element={<Offers />} />
                  <Route path="/offers/:id" element={<OfferDetail />} />
                  <Route path="/offers/create" element={<CreateOffer />} />
                  <Route path="/offers/edit/:id" element={<CreateOffer />} />
                  
                  <Route path="/contracts" element={<Contracts />} />
                  <Route path="/contracts/:id" element={<ContractDetail />} />
                  
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  
                  <Route path="/partners" element={<Partners />} />
                  <Route path="/partners/:id" element={<PartnerDetail />} />
                  <Route path="/partners/create" element={<PartnerCreate />} />
                  <Route path="/partners/edit/:id" element={<PartnerEdit />} />
                  
                  <Route path="/ambassadors" element={<AmbassadorsList />} />
                  <Route path="/ambassadors/:id" element={<AmbassadorDetail />} />
                  <Route path="/ambassadors/create" element={<AmbassadorCreate />} />
                  <Route path="/ambassadors/edit/:id" element={<AmbassadorEdit />} />
                  
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/clients/:id" element={<ClientDetail />} />
                  <Route path="/clients/create" element={<ClientCreate />} />
                  <Route path="/clients/edit/:id" element={<ClientEdit />} />
                  
                  <Route path="/request-infos" element={<RequestInfos />} />
                  <Route path="/request-infos/:id" element={<RequestInfoDetail />} />
                  
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/catalog/create" element={<CatalogCreate />} />
                  <Route path="/catalog/edit/:id" element={<CatalogEdit />} />
                </>
              )}
              
              {isPartner && (
                <>
                  <Route path="/partner/dashboard" element={<PartnerDashboard />} />
                  <Route path="/partner/offers" element={<PartnerOffers />} />
                  <Route path="/partner/offers/:id" element={<PartnerOfferDetail />} />
                  <Route path="/partner/offers/create" element={<PartnerCreateOffer />} />
                </>
              )}
              
              {isAmbassador && (
                <>
                  <Route path="/ambassador/dashboard" element={<AmbassadorDashboard />} />
                  <Route path="/ambassador/offers" element={<AmbassadorOffers />} />
                  <Route path="/ambassador/offers/:id" element={<AmbassadorOfferDetail />} />
                </>
              )}
              
              <Route path="/calculator/:type/:id" element={<CommissionCalculator />} />
            </Route>
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      
      <Toaster />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SonnerToaster position="bottom-right" closeButton />
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default Router;
