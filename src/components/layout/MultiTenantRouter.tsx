import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SubdomainProvider } from "@/context/SubdomainContext";
import { SubdomainDetector } from "./SubdomainDetector";
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
    <SubdomainProvider>
      <SubdomainDetector>
        <Routes>
      {/* Page d'accueil - Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Route de connexion accessible à tous */}
      <Route path="/login" element={<Login />} />
      
      {/* Route de mot de passe oublié accessible à tous */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Route de mise à jour du mot de passe accessible à tous */}
      <Route path="/update-password" element={<UpdatePassword />} />
      
      {/* Route de signature d'offre accessible à tous (sans authentification) */}
      <Route path="/client/sign-offer/:id" element={<SignOffer />} />
      
      {/* Pages publiques des sous-menus */}
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
      
      {/* Routes publiques pour les entreprises (sans authentification) */}
      <Route path="/public/:companyId" element={<PublicCompanyLanding />} />
      <Route path="/public/:companyId/catalog" element={<PublicCatalogAnonymous />} />
      <Route path="/public/:companyId/products/:id" element={<ProductDetailPage />} />
      <Route path="/public/:companyId/panier" element={<PublicCartPage />} />
      <Route path="/public/:companyId/demande" element={<PublicRequestPage />} />
      
      {/* Routes de catalogue avec détection automatique d'entreprise */}
      <Route path="/catalog" element={<PublicCatalogAnonymous />} />
      
      {/* Anciennes routes pour compatibilité - redirection */}
      <Route path="/catalog/anonymous/:companyId" element={<PublicCatalogAnonymous />} />
      
      {/* Routage intelligent basé sur le rôle */}
      <Route path="/*" element={<RoleBasedRoutes />} />
        </Routes>
      </SubdomainDetector>
    </SubdomainProvider>
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
                   <Route path="/catalog" element={<PublicCatalogAnonymous />} />
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
        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

export default MultiTenantRouter;
