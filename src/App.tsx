import { lazy, Suspense, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ChangelogModal from "@/components/shared/ChangelogModal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyBrandingProvider } from "@/context/CompanyBrandingContext";
import { CartProvider } from "@/context/CartContext";
import { VoiceProvider } from "@/context/VoiceContext";
import FloatingSoftphone from "@/components/voice/FloatingSoftphone";


import { ThemeProvider } from "@/components/providers/theme-provider";
import { RoleBasedRoutes } from "@/components/auth/RoleBasedRoutes";
import { PrivateRoute } from "@/components/PrivateRoute";
import ErrorBoundaryWrapper from "@/components/layout/ErrorBoundaryWrapper";

// Auth pages
const Login = lazy(() => import("@/pages/Login"));
import { getTenantSlug } from "@/utils/tenantDetection";
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const Signup = lazy(() => import("@/pages/Signup"));
const UpdatePassword = lazy(() => import("@/pages/UpdatePassword"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));

// Public pages
const HomePage = lazy(() => import("@/pages/HomePage"));
import PublicCatalogList from "@/components/public/PublicCatalogList";
const DebugSlugs = lazy(() => import("@/pages/DebugSlugs"));

// Public information pages
const SolutionsPage = lazy(() => import("@/pages/SolutionsPage"));
const ServicesPage = lazy(() => import("@/pages/ServicesPage"));
const ResourcesPage = lazy(() => import("@/pages/ResourcesPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const EnterprisesSolutionsPage = lazy(() => import("@/pages/EnterprisesSolutionsPage"));
const ProfessionalsSolutionsPage = lazy(() => import("@/pages/ProfessionalsSolutionsPage"));
const CRMFeaturePage = lazy(() => import("@/pages/CRMFeaturePage"));
const CalculatorPage = lazy(() => import("@/pages/CalculatorPage"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));

// Public slug-based pages
import PublicSlugCatalog from "@/components/public/PublicSlugCatalog";
import PublicSlugProductDetails from "@/components/public/PublicSlugProductDetails";
import PublicSlugProductBySlug from "@/components/public/PublicSlugProductBySlug";
import PublicSlugCart from "@/components/public/PublicSlugCart";
import PublicSlugRequestSteps from "@/components/public/PublicSlugRequestSteps";
const PackDetailPage = lazy(() => import("@/pages/PackDetailPage"));

// Routing guards
import CompanySlugGuard from "@/components/routing/CompanySlugGuard";

// Hooks
import { useUtmCapture } from "@/hooks/useUtmCapture";

// Admin pages
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AdminChatPage = lazy(() => import("@/pages/AdminChatPage"));
const Clients = lazy(() => import("@/pages/Clients"));
const KycQueue = lazy(() => import("@/pages/KycQueue"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const ClientEditPage = lazy(() => import("@/pages/ClientEditPage"));
const Offers = lazy(() => import("@/pages/Offers"));
const AdminOfferDetail = lazy(() => import("@/pages/AdminOfferDetail"));
const Contracts = lazy(() => import("@/pages/Contracts"));
const Settings = lazy(() => import("@/pages/Settings"));
const CatalogManagement = lazy(() => import("@/pages/CatalogManagement"));
const CatalogImportPage = lazy(() => import("@/pages/AdminPages/CatalogImportPage"));
const InvoicingPage = lazy(() => import("@/pages/InvoicingPage"));
const CostManagementPage = lazy(() => import("@/pages/CostManagementPage"));
const CostCentersPage = lazy(() => import("@/pages/CostCentersPage"));
const InvoiceDetailPage = lazy(() => import("@/pages/InvoiceDetailPage"));
const InvoiceEditPage = lazy(() => import("@/pages/InvoiceEditPage"));
const CompanyDocuments = lazy(() => import("@/pages/CompanyDocuments"));
const ClientDocumentsPage = lazy(() => import("@/pages/ClientDocumentsPage"));
const SourcingOptimizerPage = lazy(() => import("@/pages/SourcingOptimizerPage"));
const ClientDuplicates = lazy(() => import("@/pages/admin/ClientDuplicates"));
const ImportHistoricalData = lazy(() => import("@/pages/admin/ImportHistoricalData"));
const EquipmentOrders = lazy(() => import("@/pages/admin/EquipmentOrders"));
const StockManagement = lazy(() => import("@/pages/admin/StockManagement"));
const Tasks = lazy(() => import("@/pages/admin/Tasks"));
const SupportPage = lazy(() => import("@/pages/admin/SupportPage"));
const PhoneCallCenter = lazy(() => import("@/pages/admin/PhoneCallCenter"));
const VoiceCampaigns = lazy(() => import("@/pages/admin/VoiceCampaigns"));
const CRMPage = lazy(() => import("@/pages/CRMPage"));
const HelpPage = lazy(() => import("@/pages/admin/HelpPage"));

// Admin settings pages
const CompanyValuesSettings = lazy(() => import("@/pages/admin/settings/CompanyValuesSettings"));
const CompanyMetricsSettings = lazy(() => import("@/pages/admin/settings/CompanyMetricsSettings"));
const PartnerLogosSettings = lazy(() => import("@/pages/admin/settings/PartnerLogosSettings"));

const LeazrSaaSDashboard = lazy(() => import("@/pages/LeazrSaaSDashboard"));
const LeazrSaasClients = lazy(() => import("@/pages/LeazrSaasClients"));
const LeazrSaaSUsers = lazy(() => import("@/pages/LeazrSaaSUsers"));
const CompanyDetailsPage = lazy(() => import("@/pages/CompanyDetailsPage"));
const CompanySubscriptionPage = lazy(() => import("@/pages/CompanySubscriptionPage"));
const SubscriptionSettings = lazy(() => import("@/pages/SubscriptionSettings"));
const CompanyActionsPage = lazy(() => import("@/pages/CompanyActionsPage"));
const LeazrSaaSAnalytics = lazy(() => import("@/pages/LeazrSaaSAnalytics"));
const LeazrSaaSBilling = lazy(() => import("@/pages/LeazrSaaSBilling"));
const LeazrSaaSSettings = lazy(() => import("@/pages/LeazrSaaSSettings"));
const LeazrSaaSSupport = lazy(() => import("@/pages/LeazrSaaSSupport"));
const LeazrSaaSPlans = lazy(() => import("@/pages/LeazrSaaSPlans"));
const LeazrSaaSSubscriptions = lazy(() => import("@/pages/LeazrSaaSSubscriptions"));

// Route guards
import AdminPrivateRoute from "@/components/routing/AdminPrivateRoute";
import ClientPrivateRoute from "@/components/routing/ClientPrivateRoute";
import BrokerPrivateRoute from "@/components/routing/BrokerPrivateRoute";

// Broker components
import BrokerLayout from "@/components/layout/BrokerLayout";
const BrokerDashboard = lazy(() => import("@/pages/broker/BrokerDashboard"));
const BrokerClients = lazy(() => import("@/pages/broker/BrokerClients"));
const BrokerOffers = lazy(() => import("@/pages/broker/BrokerOffers"));
const BrokerContracts = lazy(() => import("@/pages/broker/BrokerContracts"));
const BrokerAnalytics = lazy(() => import("@/pages/broker/BrokerAnalytics"));
const BrokerCreateOffer = lazy(() => import("@/pages/broker/BrokerCreateOffer"));
const BrokerSettings = lazy(() => import("@/pages/broker/BrokerSettings"));


// Ambassador management pages
const AmbassadorsList = lazy(() => import("@/pages/AmbassadorsList"));
const AmbassadorDetail = lazy(() => import("@/pages/AmbassadorDetail"));
const AmbassadorEditPage = lazy(() => import("@/pages/AmbassadorEditPage"));
const AmbassadorCreatePage = lazy(() => import("@/pages/AmbassadorCreatePage"));

// Ambassador components
import AmbassadorLayout from "@/components/layout/AmbassadorLayout";
import AmbassadorPrivateRoute from "@/components/routing/AmbassadorPrivateRoute";
const AmbassadorDashboardPage = lazy(() => import("@/pages/AmbassadorPages/AmbassadorDashboardPage"));
const AmbassadorCatalogPage = lazy(() => import("@/pages/AmbassadorPages/AmbassadorCatalogPage"));
const AmbassadorCreateOffer = lazy(() => import("@/pages/AmbassadorCreateOffer"));
const CustomOfferGeneratorPage = lazy(() => import("@/pages/CustomOfferGeneratorPage"));
const AmbassadorClientsPage = lazy(() => import("@/pages/AmbassadorPages/AmbassadorClientsPage"));
const AmbassadorOffersPage = lazy(() => import("@/pages/AmbassadorPages/AmbassadorOffersPage"));
const AmbassadorClientCreatePage = lazy(() => import("@/pages/AmbassadorPages/AmbassadorClientCreatePage"));
const AmbassadorOfferDetail = lazy(() => import("@/pages/AmbassadorPages/AmbassadorOfferDetail"));
const AmbassadorProductDetailPage = lazy(() => import("@/pages/AmbassadorPages/AmbassadorProductDetailPage"));
const CreateOffer = lazy(() => import("@/pages/CreateOffer"));
import AdminCreateOfferSwitch from "@/components/routing/AdminCreateOfferSwitch";
const OfferPrintView = lazy(() => import("@/pages/offers/OfferPrintView"));

// Client offer signing
const SignOffer = lazy(() => import("@/pages/client/SignOffer"));
const PublicContractSignature = lazy(() => import("@/pages/client/PublicContractSignature"));
const PublicSignedContractDownload = lazy(() => import("@/pages/client/PublicSignedContractDownload"));
import PublicContractErrorBoundary from "@/components/contracts/PublicContractErrorBoundary";
const OfferDocumentUpload = lazy(() => import("@/pages/OfferDocumentUpload"));
import RedirectToUpload from "@/components/RedirectToUpload";

const ProductFormPage = lazy(() => import("@/pages/ProductFormPage"));
const ContractDetail = lazy(() => import("@/pages/ContractDetail"));
import Layout from "@/components/layout/Layout";
const CartPage = lazy(() => import("@/pages/CartPage"));
import ClientRoutes from "@/components/layout/ClientRoutes";
import RedirectLegacyToSlug from "@/components/routing/RedirectLegacyToSlug";

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


const RouteFallback = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

// Main App Routes component
const AppRoutes = () => {
  // Capture UTM / fbclid params on landing for Meta Ads attribution (AdiOS).
  // Idempotent — only persists when real attribution params are in the URL.
  useUtmCapture();

  return (
  <Suspense fallback={<RouteFallback />}>
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
    <Route path="/" element={getTenantSlug() ? <Navigate to="/login" replace /> : <HomePage />} />
    <Route path="/catalog" element={<PublicCatalogList />} />
    <Route path="/debug-slugs" element={<DebugSlugs />} />
    
    {/* Client offer signing route - needs access to providers */}
    <Route path="/client/offer/:id/sign" element={<SignOffer />} />
    
    {/* Public contract signature routes for self-leasing - wrapped with error boundary */}
    <Route path="/contract/:token/sign" element={<PublicContractErrorBoundary><PublicContractSignature /></PublicContractErrorBoundary>} />
    <Route path="/:companySlug/contract/:token/sign" element={<PublicContractErrorBoundary><PublicContractSignature /></PublicContractErrorBoundary>} />
    
    {/* Public signed contract PDF download routes */}
    <Route path="/contract/:token/signed.pdf" element={<PublicSignedContractDownload />} />
    <Route path="/:companySlug/contract/:token/signed.pdf" element={<PublicSignedContractDownload />} />
    
    
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
    {/* ⚠️ LEGACY ROUTES - Redirection vers routes avec slug */}
    <Route path="/contracts/:id" element={<RedirectLegacyToSlug />} />
    <Route path="/contracts" element={<RedirectLegacyToSlug />} />
    {/* Legacy admin invoicing routes -> redirect to slug */}
    <Route path="/admin/invoicing" element={<RedirectLegacyToSlug />} />
    <Route path="/admin/invoicing/:id" element={<RedirectLegacyToSlug />} />
    <Route path="/admin/invoicing/:id/edit" element={<RedirectLegacyToSlug />} />
    
    {/* ⚠️ MULTI-TENANT AMBASSADOR ROUTES ⚠️ */}
    <Route path="/:companySlug/ambassador/*" element={<AmbassadorPrivateRoute />}>
      <Route path="" element={<AmbassadorLayout />}>
        <Route path="dashboard" element={<AmbassadorDashboardPage />} />
        <Route path="catalog" element={<AmbassadorCatalogPage />} />
        <Route path="products/:id" element={<AmbassadorProductDetailPage />} />
        <Route path="custom-offer-generator" element={<CustomOfferGeneratorPage />} />
        <Route path="create-offer" element={<AmbassadorCreateOffer />} />
        <Route path="edit-offer/:id" element={<AmbassadorCreateOffer />} />
        <Route path="clients" element={<AmbassadorClientsPage />} />
        <Route path="clients/create" element={<AmbassadorClientCreatePage />} />
        <Route path="offers" element={<AmbassadorOffersPage />} />
        <Route path="offers/:id" element={<AmbassadorOfferDetail />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
      {/* Offer print view route - outside Layout for clean printing */}
      <Route path="offers/:offerId/print" element={<OfferPrintView />} />
    </Route>
    
    {/* ⚠️ MULTI-TENANT BROKER ROUTES ⚠️ */}
    <Route path="/:brokerSlug/broker/*" element={<BrokerPrivateRoute />}>
      <Route path="" element={<BrokerLayout />}>
        <Route path="dashboard" element={<BrokerDashboard />} />
        <Route path="clients" element={<BrokerClients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="clients/edit/:id" element={<ClientEditPage />} />
        <Route path="create-offer" element={<BrokerCreateOffer />} />
        <Route path="offers" element={<BrokerOffers />} />
        <Route path="offers/:id" element={<AdminOfferDetail />} />
        <Route path="contracts" element={<BrokerContracts />} />
        <Route path="contracts/:id" element={<ContractDetail />} />
        <Route path="analytics" element={<BrokerAnalytics />} />
        <Route path="settings" element={<BrokerSettings />} />
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
      <Route path="clients/kyc-queue" element={<Layout><KycQueue /></Layout>} />
      <Route path="clients/duplicates" element={<Layout><ClientDuplicates /></Layout>} />
      <Route path="clients/:id" element={<Layout><ClientDetail /></Layout>} />
      <Route path="clients/edit/:id" element={<Layout><ClientEditPage /></Layout>} />
      <Route path="offers" element={<Layout><Offers /></Layout>} />
      <Route path="offers/:id" element={<Layout><AdminOfferDetail /></Layout>} />
      <Route path="edit-offer/:id" element={<Layout><CreateOffer /></Layout>} />
      <Route path="contracts" element={<Layout><Contracts /></Layout>} />
      <Route path="contracts/:id" element={<Layout><ContractDetail /></Layout>} />
      <Route path="settings" element={<Layout><Settings /></Layout>} />
      <Route path="documents" element={<Layout><CompanyDocuments /></Layout>} />
      <Route path="client-documents" element={<Layout><ClientDocumentsPage /></Layout>} />
      <Route path="sourcing" element={<Layout><SourcingOptimizerPage /></Layout>} />
      <Route path="catalog" element={<Layout><CatalogManagement /></Layout>} />
      <Route path="catalog/import" element={<Layout><CatalogImportPage /></Layout>} />
      <Route path="invoicing" element={<Layout><InvoicingPage /></Layout>} />
      <Route path="invoicing/:id" element={<Layout><InvoiceDetailPage /></Layout>} />
      <Route path="invoicing/:id/edit" element={<Layout><InvoiceEditPage /></Layout>} />
      <Route path="gestion" element={<Layout><CostManagementPage /></Layout>} />
      <Route path="comptoirs" element={<Layout><CostCentersPage /></Layout>} />
      <Route path="create-offer" element={<Layout><AdminCreateOfferSwitch /></Layout>} />
      <Route path="panier" element={<Layout><CartPage /></Layout>} />
      
      {/* Settings sub-routes */}
      <Route path="settings/subscription" element={<Layout><SubscriptionSettings /></Layout>} />
      <Route path="settings/company-values" element={<Layout><CompanyValuesSettings /></Layout>} />
      <Route path="settings/company-metrics" element={<Layout><CompanyMetricsSettings /></Layout>} />
      <Route path="settings/partner-logos" element={<Layout><PartnerLogosSettings /></Layout>} />
      
      {/* Import historical data - temporary admin route */}
      <Route path="import-historical" element={<Layout><ImportHistoricalData /></Layout>} />
      <Route path="equipment-orders" element={<Layout><EquipmentOrders /></Layout>} />
      <Route path="stock" element={<Layout><StockManagement /></Layout>} />
      <Route path="tasks" element={<Layout><Tasks /></Layout>} />
      <Route path="support" element={<Layout><SupportPage /></Layout>} />
      <Route path="phone" element={<Layout><PhoneCallCenter /></Layout>} />
      <Route path="voice-campaigns" element={<Layout><VoiceCampaigns /></Layout>} />
      <Route path="crm" element={<Layout><CRMPage /></Layout>} />
      <Route path="aide" element={<Layout><HelpPage /></Layout>} />
      
      {/* Unified product form routes - handles both creation and editing */}
      <Route path="catalog/form/:id?" element={<Layout><ProductFormPage /></Layout>} />
      
      {/* Legacy redirects for backward compatibility */}
      <Route path="catalog/create" element={<Layout><ProductFormPage /></Layout>} />
      <Route path="catalog/edit/:id" element={<Layout><ProductFormPage /></Layout>} />
      
      {/* Offer print view route - outside Layout for clean printing */}
      <Route path="offers/:offerId/print" element={<OfferPrintView />} />
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
  </Suspense>
  );
};

// Détecte un nouveau déploiement (changement du hash du bundle principal) et
// propose à l'utilisateur de recharger pour obtenir la nouvelle version.
// (commit déclencheur pour visualiser le nouveau bandeau de mise à jour)
function useAppUpdateCheck() {
  useEffect(() => {
    const cur = Array.from(document.querySelectorAll("script[src]"))
      .map((s) => (s as HTMLScriptElement).src)
      .find((s) => /\/assets\/index-.*\.js$/.test(s));
    if (!cur) return;
    let notified = false;
    async function check() {
      if (notified || document.hidden) return;
      try {
        const html = await fetch("/", { cache: "no-store" }).then((r) => r.text());
        const m = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
        if (m && cur && !cur.endsWith(m[0])) {
          notified = true;
          toast.custom(
            () => (
              <div className="w-[460px] max-w-[92vw] rounded-3xl border border-emerald-200 bg-white p-7 shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
                    <Sparkles className="h-7 w-7 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">Nouvelle version disponible</p>
                    <p className="mt-1.5 text-base text-slate-500">
                      Une mise à jour de Leazr est prête. Rechargez pour en profiter.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 px-6 py-5 text-lg font-bold text-white shadow-md transition-colors hover:bg-emerald-700"
                >
                  <RefreshCw className="h-6 w-6" />
                  Recharger maintenant
                </button>
              </div>
            ),
            { duration: Infinity, unstyled: true, style: { width: "460px", maxWidth: "92vw" } },
          );
        }
      } catch {
        /* hors-ligne : on réessaiera */
      }
    }
    const iv = setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
}

function App() {
  console.log('🚀 App component rendering...');
  useAppUpdateCheck();
  
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
                      <VoiceProvider>
                        <AppRoutes />
                        <FloatingSoftphone />
                      </VoiceProvider>
                    </CartProvider>
                  </CompanyBrandingProvider>
                </AuthProvider>
              </BrowserRouter>
              <Toaster />
              <Sonner />
              <ChangelogModal />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundaryWrapper>
  );
}

export default App;
