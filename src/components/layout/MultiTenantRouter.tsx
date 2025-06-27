import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Layout from "./Layout";
import ClientRoutes from "./ClientRoutes";
import AmbassadorLayout from "./AmbassadorLayout";
import AmbassadorRoutes from "./AmbassadorRoutes";
import PartnerRoutes from "./PartnerRoutes";

// Pages admin existantes
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";

// Pages publiques (sans authentification)
import LandingPage from "@/pages/LandingPage";
import PublicCompanyLanding from "@/pages/PublicCompanyLanding";
import PublicCatalogAnonymous from "@/pages/PublicCatalogAnonymous";
import ProductDetailPage from "@/pages/ProductDetailPage";
import PublicProductDetailPage from "@/pages/PublicProductDetailPage";
import PublicCartPage from "@/pages/PublicCartPage";
import PublicRequestPage from "@/pages/PublicRequestPage";

// Pages des sous-menus
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

// Pages admin
import CatalogManagement from "@/pages/CatalogManagement";
import ProductEditPage from "@/pages/ProductEditPage";
import PartnerEditPage from "@/pages/PartnerEditPage";
import AmbassadorCatalog from "@/pages/AmbassadorCatalog";
import AmbassadorCreatePage from "@/pages/AmbassadorCreatePage";
import AmbassadorDetail from "@/pages/AmbassadorDetail";
import AmbassadorEditPage from "@/pages/AmbassadorEditPage";
import AmbassadorsList from "@/pages/AmbassadorsList";
import PartnerDetail from "@/pages/PartnerDetail";
import PublicCatalogMultiTenant from "@/pages/PublicCatalogMultiTenant";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import ClientEditPage from "@/pages/ClientEditPage";
import CreateOffer from "@/pages/CreateOffer";
import Offers from "@/pages/Offers";
import OfferDetail from "@/pages/OfferDetail";
import Contracts from "@/pages/Contracts";
import Settings from "@/pages/Settings";
import CompanySettingsPage from "@/pages/CompanySettingsPage";
import CRMPage from "@/pages/CRMPage";

// Page de signature d'offre
import SignOffer from "@/pages/client/SignOffer";

// Page de mise à jour du mot de passe
import UpdatePassword from "@/pages/UpdatePassword";

// Other imports for complete functionality
import Signup from "@/pages/Signup";
import AuthCallback from "@/pages/AuthCallback";
import PublicCatalog from "@/pages/PublicCatalog";
import RequestSentPage from "@/pages/RequestSentPage";
import PublicOfferView from "@/pages/client/PublicOfferView";
import OfferDocumentUpload from "@/pages/OfferDocumentUpload";
import AdminOfferDetail from "@/pages/AdminOfferDetail";
import LeazrSaaSDashboard from "@/pages/LeazrSaaSDashboard";
import UnifiedSolutionsPage from "@/pages/UnifiedSolutionsPage";
import HubPage from "@/pages/HubPage";
import HomePage from "@/pages/HomePage";

const MultiTenantRouter = () => {
  const { user, isLoading, isAdmin, isClient, isPartner, isAmbassador } = useAuth();

  // Pendant le chargement, afficher un loader
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Page d'accueil - Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Route de connexion accessible à tous */}
      <Route path="/login" element={<Login />} />
      
      {/* Route de mot de passe oublié accessible à tous */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Route de mise à jour du mot de passe accessible à tous */}
      <Route path="/update-password" element={<UpdatePassword />} />
      
      {/* Public Authentication Routes */}
      <Route path="/signup" element={<Signup />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
      <Route path="/mettre-a-jour-mot-de-passe" element={<UpdatePassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Route de signature d'offre accessible à tous (sans authentification) */}
      <Route path="/client/sign-offer/:id" element={<SignOffer />} />
      
      {/* Pages publiques des sous-menus */}
      <Route path="/solutions" element={<SolutionsPage />} />
      <Route path="/solutions/entreprises" element={<EnterprisesSolutionsPage />} />
      <Route path="/solutions/professionnels" element={<ProfessionalsSolutionsPage />} />
      <Route path="/solutions/crm" element={<CRMFeaturePage />} />
      <Route path="/solutions/calculateur" element={<CalculatorPage />} />
      <Route path="/solutions/unified" element={<UnifiedSolutionsPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/ressources" element={<ResourcesPage />} />
      <Route path="/a-propos" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/blog" element={<ResourcesPage />} />
      <Route path="/tarifs" element={<PricingPage />} />
      <Route path="/fonctionnalites/crm" element={<CRMFeaturePage />} />
      <Route path="/calculateur" element={<CalculatorPage />} />
      <Route path="/hub" element={<HubPage />} />
      <Route path="/home" element={<HomePage />} />
      
      {/* Public Catalog and Commerce Routes */}
      <Route path="/catalog" element={<PublicCatalog />} />
      <Route path="/catalog/anonymous" element={<PublicCatalogAnonymous />} />
      <Route path="/catalog/:companyId" element={<PublicCatalogMultiTenant />} />
      <Route path="/product/:id" element={<PublicProductDetailPage />} />
      <Route path="/cart" element={<PublicCartPage />} />
      <Route path="/request" element={<PublicRequestPage />} />
      <Route path="/request-sent" element={<RequestSentPage />} />
      <Route path="/company/:companyId" element={<PublicCompanyLanding />} />
      
      {/* Routes publiques pour les entreprises (sans authentification) */}
      <Route path="/public/:companyId" element={<PublicCompanyLanding />} />
      <Route path="/public/:companyId/catalog" element={<PublicCatalogAnonymous />} />
      <Route path="/public/:companyId/products/:id" element={<PublicProductDetailPage />} />
      <Route path="/public/:companyId/panier" element={<PublicCartPage />} />
      <Route path="/public/:companyId/demande" element={<PublicRequestPage />} />
      
      {/* Client Public Access Routes */}
      <Route path="/client/offer/:id" element={<PublicOfferView />} />
      <Route path="/client/offer/:id/sign" element={<SignOffer />} />
      <Route path="/offer/documents/upload/:token" element={<OfferDocumentUpload />} />
      
      {/* Routage intelligent basé sur le rôle */}
      <Route path="/*" element={<RoleBasedRoutes />} />
    </Routes>
  );
};

const RoleBasedRoutes = () => {
  const { user, isAdmin, isClient, isPartner, isAmbassador } = useAuth();

  // Si pas d'utilisateur connecté, rediriger vers login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Routage selon le rôle principal de l'utilisateur
  if (isClient()) {
    return <ClientRoutes />;
  }

  if (isAmbassador()) {
    return (
      <AmbassadorLayout>
        <Routes>
          <Route path="/dashboard" element={<Navigate to="/ambassador/dashboard" replace />} />
          <Route path="/ambassador/*" element={<AmbassadorRoutes />} />
          <Route path="*" element={<Navigate to="/ambassador/dashboard" replace />} />
        </Routes>
      </AmbassadorLayout>
    );
  }

  if (isPartner()) {
    return <PartnerRoutes />;
  }

  // Par défaut (admin ou utilisateur sans rôle spécifique), utiliser l'interface admin
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/clients/edit/:id" element={<ClientEditPage />} />
        <Route path="/admin/offers" element={<Offers />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/offers/:id" element={<OfferDetail />} />
        <Route path="/admin/offers/:id" element={<OfferDetail />} />
        <Route path="/create-offer" element={<CreateOffer />} />
        <Route path="/admin/create-offer" element={<CreateOffer />} />
        <Route path="/admin/contracts" element={<Contracts />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/company/settings" element={<CompanySettingsPage />} />
        <Route path="/crm" element={<CRMPage />} />
        <Route path="/catalog" element={<PublicCatalogMultiTenant />} />
        <Route path="/admin/catalog" element={<CatalogManagement />} />
        <Route path="/catalog/edit/:id" element={<ProductEditPage />} />
        <Route path="/admin/catalog/edit/:id" element={<ProductEditPage />} />
        <Route path="/partners/edit/:id" element={<PartnerEditPage />} />
        <Route path="/admin/partners/edit/:id" element={<PartnerEditPage />} />
        <Route path="/ambassador/catalog" element={<AmbassadorCatalog />} />
        <Route path="/ambassadors/create" element={<AmbassadorCreatePage />} />
        <Route path="/ambassadors" element={<AmbassadorsList />} />
        <Route path="/ambassadors/:id" element={<AmbassadorDetail />} />
        <Route path="/ambassadors/edit/:id" element={<AmbassadorEditPage />} />
        <Route path="/partners/:id" element={<PartnerDetail />} />
        <Route path="/admin/leazr-saas-dashboard" element={<LeazrSaaSDashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/settings" element={<Settings />} />
        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

export default MultiTenantRouter;
