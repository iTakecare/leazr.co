
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyBrandingProvider } from "@/context/CompanyBrandingContext";
import { CartProvider } from "@/context/CartContext";


import { ThemeProvider } from "@/components/providers/theme-provider";
import { RoleBasedRoutes } from "@/components/auth/RoleBasedRoutes";
import { PrivateRoute } from "@/components/PrivateRoute";
import ErrorBoundaryWrapper from "@/components/layout/ErrorBoundaryWrapper";

// Auth pages
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import Signup from "@/pages/Signup";
import UpdatePassword from "@/pages/UpdatePassword";
import AuthCallback from "@/pages/AuthCallback";
import ResetPassword from "@/pages/auth/ResetPassword";

// Public pages
import HomePage from "@/pages/HomePage";
import PublicCatalogList from "@/components/public/PublicCatalogList";
import DebugSlugs from "@/pages/DebugSlugs";

// Public information pages
import SolutionsPage from "@/pages/SolutionsPage";
import ServicesPage from "@/pages/ServicesPage";
import ResourcesPage from "@/pages/ResourcesPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import EnterprisesSolutionsPage from "@/pages/EnterprisesSolutionsPage";
import ProfessionalsSolutionsPage from "@/pages/ProfessionalsSolutionsPage";
import CRMFeaturePage from "@/pages/CRMFeaturePage";
import CalculatorPage from "@/pages/CalculatorPage";
import PricingPage from "@/pages/PricingPage";

// Public slug-based pages
import PublicSlugCatalog from "@/components/public/PublicSlugCatalog";
import PublicSlugProductDetails from "@/components/public/PublicSlugProductDetails";
import PublicSlugProductBySlug from "@/components/public/PublicSlugProductBySlug";
import PublicSlugCart from "@/components/public/PublicSlugCart";
import PublicSlugRequestSteps from "@/components/public/PublicSlugRequestSteps";
import PackDetailPage from "@/pages/PackDetailPage";

// Routing guards
import CompanySlugGuard from "@/components/routing/CompanySlugGuard";

// Admin pages
import Dashboard from "@/pages/Dashboard";
import AdminChatPage from "@/pages/AdminChatPage";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import ClientEditPage from "@/pages/ClientEditPage";
import Offers from "@/pages/Offers";
import AdminOfferDetail from "@/pages/AdminOfferDetail";
import Contracts from "@/pages/Contracts";
import Settings from "@/pages/Settings";
import CatalogManagement from "@/pages/CatalogManagement";
import CatalogImportPage from "@/pages/AdminPages/CatalogImportPage";
import InvoicingPage from "@/pages/InvoicingPage";
import InvoiceDetailPage from "@/pages/InvoiceDetailPage";
import InvoiceEditPage from "@/pages/InvoiceEditPage";
import CompanyDocuments from "@/pages/CompanyDocuments";
import ClientDuplicates from "@/pages/admin/ClientDuplicates";

import LeazrSaaSDashboard from "@/pages/LeazrSaaSDashboard";
import LeazrSaasClients from "@/pages/LeazrSaasClients";
import LeazrSaaSUsers from "@/pages/LeazrSaaSUsers";
import CompanyDetailsPage from "@/pages/CompanyDetailsPage";
import CompanySubscriptionPage from "@/pages/CompanySubscriptionPage";
import CompanyActionsPage from "@/pages/CompanyActionsPage";
import LeazrSaaSAnalytics from "@/pages/LeazrSaaSAnalytics";
import LeazrSaaSBilling from "@/pages/LeazrSaaSBilling";
import LeazrSaaSSettings from "@/pages/LeazrSaaSSettings";
import LeazrSaaSSupport from "@/pages/LeazrSaaSSupport";
import LeazrSaaSPlans from "@/pages/LeazrSaaSPlans";
import LeazrSaaSSubscriptions from "@/pages/LeazrSaaSSubscriptions";

// Route guards
import AdminPrivateRoute from "@/components/routing/AdminPrivateRoute";
import ClientPrivateRoute from "@/components/routing/ClientPrivateRoute";


// Ambassador management pages
import AmbassadorsList from "@/pages/AmbassadorsList";
import AmbassadorDetail from "@/pages/AmbassadorDetail";
import AmbassadorEditPage from "@/pages/AmbassadorEditPage";
import AmbassadorCreatePage from "@/pages/AmbassadorCreatePage";

// Ambassador components
import AmbassadorLayout from "@/components/layout/AmbassadorLayout";
import AmbassadorPrivateRoute from "@/components/routing/AmbassadorPrivateRoute";
import AmbassadorDashboardPage from "@/pages/AmbassadorPages/AmbassadorDashboardPage";
import AmbassadorCatalogPage from "@/pages/AmbassadorPages/AmbassadorCatalogPage";
import AmbassadorCreateOffer from "@/pages/AmbassadorCreateOffer";
import CustomOfferGeneratorPage from "@/pages/CustomOfferGeneratorPage";
import AmbassadorClientsPage from "@/pages/AmbassadorPages/AmbassadorClientsPage";
import AmbassadorOffersPage from "@/pages/AmbassadorPages/AmbassadorOffersPage";
import AmbassadorClientCreatePage from "@/pages/AmbassadorPages/AmbassadorClientCreatePage";
import AmbassadorOfferDetail from "@/pages/AmbassadorPages/AmbassadorOfferDetail";
import AmbassadorProductDetailPage from "@/pages/AmbassadorPages/AmbassadorProductDetailPage";
import CreateOffer from "@/pages/CreateOffer";

// Client offer signing
import SignOffer from "@/pages/client/SignOffer";
import OfferDocumentUpload from "@/pages/OfferDocumentUpload";
import RedirectToUpload from "@/components/RedirectToUpload";

import ProductFormPage from "@/pages/ProductFormPage";
import ContractDetail from "@/pages/ContractDetail";
import Layout from "@/components/layout/Layout";
import CartPage from "@/pages/CartPage";
import ClientRoutes from "@/components/layout/ClientRoutes";

// Create QueryClient instance outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Main App Routes component
const AppRoutes = () => (
  <Routes>
    {/* AUTHENTICATION ROUTES - HIGHEST PRIORITY */}
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/update-password" element={<UpdatePassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/register" element={<Signup />} />
    
    {/* Company-specific update password route */}
    <Route path="/:companySlug/update-password" element={<UpdatePassword />} />
    
    {/* PUBLIC INFORMATION PAGES - Must come before slug routes */}
    <Route path="/solutions" element={<SolutionsPage />} />
    <Route path="/solutions/entreprises" element={<EnterprisesSolutionsPage />} />
    <Route path="/solutions/professionnels" element={<ProfessionalsSolutionsPage />} />
    <Route path="/solutions/crm" element={<CRMFeaturePage />} />
    <Route path="/solutions/calculateur" element={<CalculatorPage />} />
    <Route path="/services" element={<ServicesPage />} />
    <Route path="/ressources" element={<ResourcesPage />} />
    <Route path="/a-propos" element={<AboutPage />} />
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/blog" element={<ResourcesPage />} />
    <Route path="/tarifs" element={<PricingPage />} />
    
    {/* Public routes */}
    <Route path="/" element={<HomePage />} />
    <Route path="/catalog" element={<PublicCatalogList />} />
    <Route path="/debug-slugs" element={<DebugSlugs />} />
    
    {/* Client offer signing route - needs access to providers */}
    <Route path="/client/offer/:id/sign" element={<SignOffer />} />
    
    {/* Company-specific login route - must be before generic company slug routes */}
    <Route path="/:companySlug/login" element={<Login />} />
    
    {/* Redirect route removed - now handled by edge function redirect-upload */}
    
    {/* Document upload routes - moved to proper position to avoid slug conflicts */}
    
    {/* LEAZR SAAS ADMIN ROUTES - Dedicated routes for SaaS administration */}
    <Route path="/admin/leazr-saas-dashboard" element={<Layout><LeazrSaaSDashboard /></Layout>} />
    <Route path="/admin/leazr-saas-clients" element={<Layout><LeazrSaasClients /></Layout>} />
    <Route path="/admin/leazr-saas-users" element={<Layout><LeazrSaaSUsers /></Layout>} />
    <Route path="/admin/leazr-saas-users/company/:id/details" element={<Layout><CompanyDetailsPage /></Layout>} />
    <Route path="/admin/leazr-saas-users/company/:id/subscription" element={<Layout><CompanySubscriptionPage /></Layout>} />
    <Route path="/admin/leazr-saas-users/company/:id/actions" element={<Layout><CompanyActionsPage /></Layout>} />
    <Route path="/admin/leazr-saas-analytics" element={<Layout><LeazrSaaSAnalytics /></Layout>} />
    <Route path="/admin/leazr-saas-billing" element={<Layout><LeazrSaaSBilling /></Layout>} />
    <Route path="/admin/leazr-saas-plans" element={<Layout><LeazrSaaSPlans /></Layout>} />
    <Route path="/admin/leazr-saas-subscriptions" element={<Layout><LeazrSaaSSubscriptions /></Layout>} />
    <Route path="/admin/leazr-saas-settings" element={<Layout><LeazrSaaSSettings /></Layout>} />
    <Route path="/admin/leazr-saas-support" element={<Layout><LeazrSaaSSupport /></Layout>} />
    
    {/* CONTRACT ROUTES - Must be before system routes to avoid slug interception */}
    <Route path="/contracts/:id" element={<PrivateRoute><Layout><ContractDetail /></Layout></PrivateRoute>} />
    <Route path="/contracts" element={<PrivateRoute><Layout><Contracts /></Layout></PrivateRoute>} />
    
    {/* ⚠️ MULTI-TENANT AMBASSADOR ROUTES ⚠️ */}
    <Route path="/:companySlug/ambassador/*" element={<AmbassadorPrivateRoute />}>
      <Route path="" element={<AmbassadorLayout />}>
        <Route path="dashboard" element={<AmbassadorDashboardPage />} />
        <Route path="catalog" element={<AmbassadorCatalogPage />} />
        <Route path="products/:id" element={<AmbassadorProductDetailPage />} />
        <Route path="custom-offer-generator" element={<CustomOfferGeneratorPage />} />
        <Route path="create-offer" element={<AmbassadorCreateOffer />} />
        <Route path="clients" element={<AmbassadorClientsPage />} />
        <Route path="clients/create" element={<AmbassadorClientCreatePage />} />
        <Route path="offers" element={<AmbassadorOffersPage />} />
        <Route path="offers/:id" element={<AmbassadorOfferDetail />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
    </Route>
    
    {/* ⚠️ MULTI-TENANT ADMIN ROUTES ⚠️ */}
    <Route path="/:companySlug/admin/*" element={<AdminPrivateRoute />}>
      {/* Admin routes with Layout */}
      <Route path="dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="leazr-saas-dashboard" element={<Layout><LeazrSaaSDashboard /></Layout>} />
      <Route path="leazr-saas-clients" element={<Layout><LeazrSaasClients /></Layout>} />
      <Route path="leazr-saas-settings" element={<Layout><LeazrSaaSSettings /></Layout>} />
      <Route path="leazr-saas-support" element={<Layout><LeazrSaaSSupport /></Layout>} />
      <Route path="chat" element={<Layout><AdminChatPage /></Layout>} />
      <Route path="clients" element={<Layout><Clients /></Layout>} />
      <Route path="clients/duplicates" element={<Layout><ClientDuplicates /></Layout>} />
      <Route path="clients/:id" element={<Layout><ClientDetail /></Layout>} />
      <Route path="clients/edit/:id" element={<Layout><ClientEditPage /></Layout>} />
      <Route path="offers" element={<Layout><Offers /></Layout>} />
      <Route path="offers/:id" element={<Layout><AdminOfferDetail /></Layout>} />
      <Route path="edit-offer/:id" element={<Layout><CreateOffer /></Layout>} />
      <Route path="contracts" element={<Layout><Contracts /></Layout>} />
      <Route path="settings" element={<Layout><Settings /></Layout>} />
      <Route path="documents" element={<Layout><CompanyDocuments /></Layout>} />
      <Route path="catalog" element={<Layout><CatalogManagement /></Layout>} />
      <Route path="catalog/import" element={<Layout><CatalogImportPage /></Layout>} />
      <Route path="invoicing" element={<Layout><InvoicingPage /></Layout>} />
      <Route path="invoicing/:id" element={<Layout><InvoiceDetailPage /></Layout>} />
      <Route path="invoicing/:id/edit" element={<Layout><InvoiceEditPage /></Layout>} />
      <Route path="create-offer" element={<Layout><CreateOffer /></Layout>} />
      <Route path="panier" element={<Layout><CartPage /></Layout>} />
      
      {/* Unified product form routes - handles both creation and editing */}
      <Route path="catalog/form/:id?" element={<Layout><ProductFormPage /></Layout>} />
      
      {/* Legacy redirects for backward compatibility */}
      <Route path="catalog/create" element={<Layout><ProductFormPage /></Layout>} />
      <Route path="catalog/edit/:id" element={<Layout><ProductFormPage /></Layout>} />
    </Route>

    {/* ⚠️ MULTI-TENANT CLIENT ROUTES ⚠️ */}
    <Route path="/:companySlug/client/*" element={<ClientPrivateRoute />}>
      <Route path="*" element={<ClientRoutes />} />
    </Route>
    
    
    {/* Ambassador management routes */}
    <Route path="/ambassadors/*" element={<PrivateRoute><RoleBasedRoutes /></PrivateRoute>}>
      <Route path="" element={<Layout><AmbassadorsList /></Layout>} />
      <Route path=":id" element={<Layout><AmbassadorDetail /></Layout>} />
      <Route path="edit/:id" element={<Layout><AmbassadorEditPage /></Layout>} />
      <Route path="create" element={<Layout><AmbassadorCreatePage /></Layout>} />
    </Route>
    
    
    {/* Other protected routes */}
    <Route element={<PrivateRoute><RoleBasedRoutes /></PrivateRoute>}>
      {/* Legacy product form routes */}
      <Route path="/catalog/form/:id?" element={<Layout><ProductFormPage /></Layout>} />
      <Route path="/catalog/create" element={<Layout><ProductFormPage /></Layout>} />
      <Route path="/catalog/edit/:id" element={<Layout><ProductFormPage /></Layout>} />
      
      {/* Default dashboard route */}
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
    </Route>
    
    {/* ⚠️ COMPANY SLUG-BASED ROUTES MUST BE LAST ⚠️ */}
    {/* These routes are generic and will match any pattern, so they must come */}
    {/* after ALL system routes (/ambassador/*, /admin/*, etc.) */}
    {/* Company slug-based routes - MUST be at the end to avoid intercepting system routes */}
    {/* Validation is handled in CompanySlugGuard component */}
    <Route path="/:companySlug/catalog" element={<CompanySlugGuard />} />
    <Route path="/:companySlug/products/:productSlug" element={<PublicSlugProductBySlug />} />
    <Route path="/:companySlug/products/:productId" element={<PublicSlugProductDetails />} />
    <Route path="/:companySlug/pack/:packId" element={<PackDetailPage />} />
    <Route path="/:companySlug/panier" element={<PublicSlugCart />} />
    <Route path="/:companySlug/demande" element={<PublicSlugRequestSteps />} />
    
    {/* Document upload routes - both with and without company slug */}
    <Route path="/offer/documents/upload/:token" element={<OfferDocumentUpload />} />
    <Route path="/:companySlug/offer/documents/upload/:token" element={<OfferDocumentUpload />} />
    
    {/* Direct redirect route for upload links */}
    <Route path="/r/:token" element={<RedirectToUpload />} />
    
    {/* Catch-all company slug route - fallback for company pages */}
    <Route path="/:companySlug" element={<CompanySlugGuard />} />
  </Routes>
);

function App() {
  console.log('🚀 App component rendering...');
  
  // Handle storage errors globally
  const handleStorageError = () => {
    console.warn('⚠️ Storage access blocked, continuing without storage');
  };

  // Add global error handler for storage issues
  window.addEventListener('error', (event) => {
    if (event.message?.includes('storage') || event.message?.includes('localStorage')) {
      handleStorageError();
      event.preventDefault();
    }
  });
  
  return (
    <ErrorBoundaryWrapper>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <TooltipProvider>
              <BrowserRouter>
                <AuthProvider>
                  <CompanyBrandingProvider>
                    <CartProvider>
                      <AppRoutes />
                    </CartProvider>
                  </CompanyBrandingProvider>
                </AuthProvider>
              </BrowserRouter>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundaryWrapper>
  );
}

export default App;
