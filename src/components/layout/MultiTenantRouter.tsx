
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Layout from "./Layout";
import ClientRoutes from "./ClientRoutes";
import AmbassadorRoutes from "./AmbassadorRoutes";
import PartnerRoutes from "./PartnerRoutes";

// Pages admin existantes
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";

// Pages publiques (sans authentification)
import PublicCompanyLanding from "@/pages/PublicCompanyLanding";
import PublicCatalogAnonymous from "@/pages/PublicCatalogAnonymous";
import ProductDetailPage from "@/pages/ProductDetailPage";
import PublicProductDetailPage from "@/pages/PublicProductDetailPage";
import PublicCartPage from "@/pages/PublicCartPage";
import PublicRequestPage from "@/pages/PublicRequestPage";

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
      {/* Route de connexion accessible à tous */}
      <Route path="/login" element={<Login />} />
      
      {/* Routes publiques pour les entreprises (sans authentification) */}
      <Route path="/public/:companyId" element={<PublicCompanyLanding />} />
      <Route path="/public/:companyId/catalog" element={<PublicCatalogAnonymous />} />
      <Route path="/public/:companyId/products/:id" element={<PublicProductDetailPage />} />
      <Route path="/public/:companyId/panier" element={<PublicCartPage />} />
      <Route path="/public/:companyId/demande" element={<PublicRequestPage />} />
      
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
    return <AmbassadorRoutes />;
  }

  if (isPartner()) {
    return <PartnerRoutes />;
  }

  // Par défaut (admin ou utilisateur sans rôle spécifique), utiliser l'interface admin
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/clients/edit/:id" element={<ClientEditPage />} />
        <Route path="/admin/offers" element={<Offers />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/offers/:id" element={<OfferDetail />} />
        <Route path="/admin/offers/:id" element={<OfferDetail />} />
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
        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

export default MultiTenantRouter;
