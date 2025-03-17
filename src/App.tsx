import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import Loader from '@/components/ui/Loader';
import ClientLayout from '@/components/layout/ClientLayout';
import ClientRoutes from '@/components/layout/ClientRoutes';
import ClientDashboard from '@/pages/ClientDashboard';
import ClientContractsPage from '@/pages/ClientContractsPage';
import ClientCalculator from '@/pages/ClientCalculator';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import CommissionCalculator from '@/pages/CommissionCalculator';

const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const OffersPage = lazy(() => import('@/pages/OffersPage'));
const OfferDetailPage = lazy(() => import('@/pages/OfferDetailPage'));
const CreateOffer = lazy(() => import('@/pages/CreateOffer'));
const ContractsPage = lazy(() => import('@/pages/ContractsPage'));
const ContractDetailPage = lazy(() => import('@/pages/ContractDetailPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const PartnersPage = lazy(() => import('@/pages/PartnersPage'));
const PartnerDetailPage = lazy(() => import('@/pages/PartnerDetailPage'));
const PartnerCreate = lazy(() => import('@/pages/PartnerCreate'));
const PartnerEdit = lazy(() => import('@/pages/PartnerEdit'));
const AmbassadorsPage = lazy(() => import('@/pages/AmbassadorsPage'));
const AmbassadorDetailPage = lazy(() => import('@/pages/AmbassadorDetailPage'));
const AmbassadorCreate = lazy(() => import('@/pages/AmbassadorCreate'));
const AmbassadorEdit = lazy(() => import('@/pages/AmbassadorEdit'));
const PartnerDashboard = lazy(() => import('@/pages/PartnerDashboard'));
const PartnerOffers = lazy(() => import('@/pages/PartnerOffers'));
const PartnerOfferDetail = lazy(() => import('@/pages/PartnerOfferDetail'));
const PartnerCreateOffer = lazy(() => import('@/pages/PartnerCreateOffer'));
const AmbassadorDashboard = lazy(() => import('@/pages/AmbassadorDashboard'));
const AmbassadorOffers = lazy(() => import('@/pages/AmbassadorOffers'));
const AmbassadorOfferDetail = lazy(() => import('@/pages/AmbassadorOfferDetail'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('@/pages/ClientDetailPage'));
const ClientCreate = lazy(() => import('@/pages/ClientCreate'));
const ClientEdit = lazy(() => import('@/pages/ClientEdit'));
const RequestInfosPage = lazy(() => import('@/pages/RequestInfosPage'));
const RequestInfoDetail = lazy(() => import('@/pages/RequestInfoDetail'));
const CatalogPage = lazy(() => import('@/pages/CatalogPage'));
const CatalogCreate = lazy(() => import('@/pages/CatalogCreate'));
const CatalogEdit = lazy(() => import('@/pages/CatalogEdit'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const EmailConfirmationPage = lazy(() => import('@/pages/EmailConfirmationPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

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
  const { isAuthenticated, user, isLoading } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  const isPartner = user?.role === 'partner';
  const isAmbassador = user?.role === 'ambassador';
  const isClient = user?.role === 'client';
  
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/email-confirmation" element={<EmailConfirmationPage />} />
          
          {/* Client routes */}
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
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute isAllowed={isAuthenticated} loading={isLoading} />}>
            <Route element={<Layout />}>
              {/* Admin routes */}
              {isAdmin && (
                <>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  
                  <Route path="/offers" element={<OffersPage />} />
                  <Route path="/offers/:id" element={<OfferDetailPage />} />
                  <Route path="/offers/create" element={<CreateOffer />} />
                  <Route path="/offers/edit/:id" element={<CreateOffer />} />
                  
                  <Route path="/contracts" element={<ContractsPage />} />
                  <Route path="/contracts/:id" element={<ContractDetailPage />} />
                  
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  
                  <Route path="/partners" element={<PartnersPage />} />
                  <Route path="/partners/:id" element={<PartnerDetailPage />} />
                  <Route path="/partners/create" element={<PartnerCreate />} />
                  <Route path="/partners/edit/:id" element={<PartnerEdit />} />
                  
                  <Route path="/ambassadors" element={<AmbassadorsPage />} />
                  <Route path="/ambassadors/:id" element={<AmbassadorDetailPage />} />
                  <Route path="/ambassadors/create" element={<AmbassadorCreate />} />
                  <Route path="/ambassadors/edit/:id" element={<AmbassadorEdit />} />
                  
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                  <Route path="/clients/create" element={<ClientCreate />} />
                  <Route path="/clients/edit/:id" element={<ClientEdit />} />
                  
                  <Route path="/request-infos" element={<RequestInfosPage />} />
                  <Route path="/request-infos/:id" element={<RequestInfoDetail />} />
                  
                  <Route path="/catalog" element={<CatalogPage />} />
                  <Route path="/catalog/create" element={<CatalogCreate />} />
                  <Route path="/catalog/edit/:id" element={<CatalogEdit />} />
                </>
              )}
              
              {/* Partner routes */}
              {isPartner && (
                <>
                  <Route path="/partner/dashboard" element={<PartnerDashboard />} />
                  <Route path="/partner/offers" element={<PartnerOffers />} />
                  <Route path="/partner/offers/:id" element={<PartnerOfferDetail />} />
                  <Route path="/partner/offers/create" element={<PartnerCreateOffer />} />
                </>
              )}
              
              {/* Ambassador routes */}
              {isAmbassador && (
                <>
                  <Route path="/ambassador/dashboard" element={<AmbassadorDashboard />} />
                  <Route path="/ambassador/offers" element={<AmbassadorOffers />} />
                  <Route path="/ambassador/offers/:id" element={<AmbassadorOfferDetail />} />
                </>
              )}
              
              {/* Add the new commission calculator route */}
              <Route path="/calculator/:type/:id" element={<CommissionCalculator />} />
              
            </Route>
          </Route>
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFoundPage />} />
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
