
import React from "react";
import { Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Layout from "./Layout";
import ClientRoutes from "./ClientRoutes";
import AmbassadorLayout from "./AmbassadorLayout";
import AmbassadorRoutes from "./AmbassadorRoutes";
import PartnerRoutes from "./PartnerRoutes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Pages admin existantes
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";

// Import PrivateRoute pour les routes contracts
import { PrivateRoute } from "@/components/PrivateRoute";

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
import ProductFormPage from "@/pages/ProductFormPage";
import PartnerEditPage from "@/pages/PartnerEditPage";

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
import ContractDetail from "@/pages/ContractDetail";
import Settings from "@/pages/Settings";
import CompanySettingsPage from "@/pages/CompanySettingsPage";
import CRMPage from "@/pages/CRMPage";

// Page de signature d'offre
import SignOffer from "@/pages/client/SignOffer";

// Page de mise à jour du mot de passe
import UpdatePassword from "@/pages/UpdatePassword";

const MultiTenantRouter = () => {
  const { user, isLoading, isAdmin, isClient, isPartner, isAmbassador } = useAuth();
  const location = useLocation();

  console.log('🔍 ROUTER DEBUG - Current location:', {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state
  });

  // Pendant le chargement, afficher un loader
  if (isLoading) {
    console.log('⏳ ROUTER - Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  console.log('🔍 ROUTER DEBUG - User state:', {
    hasUser: !!user,
    isAdmin: isAdmin(),
    isClient: isClient(),
    isPartner: isPartner(),
    isAmbassador: isAmbassador(),
    pathname: location.pathname
  });

  return (
    <Routes>
          {/* ROUTES SYSTÈME - PRIORITÉ ABSOLUE (avant les slugs) */}
          <Route path="/admin/*" element={<RoleBasedRoutes />} />
          <Route path="/ambassador/*" element={<RoleBasedRoutes />} />
          <Route path="/client/*" element={<RoleBasedRoutes />} />
          <Route path="/partner/*" element={<RoleBasedRoutes />} />
          <Route path="/dashboard/*" element={<RoleBasedRoutes />} />
          
          {/* Routes contracts - Accès direct protégé */}
          <Route path="/contracts/:id" element={<PrivateRoute><ContractDetail /></PrivateRoute>} />
          <Route path="/contracts" element={<PrivateRoute><Contracts /></PrivateRoute>} />
          
          {/* Routes d'authentification accessibles à tous */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          {/* Route de signature d'offre - maintenant gérée dans App.tsx */}
          
          {/* Pages publiques générales */}
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
          
          {/* Routes publiques avec ID explicite */}
          <Route path="/public/:companyId" element={<PublicCompanyLanding />} />
          <Route path="/public/:companyId/catalog" element={<PublicCatalogAnonymous />} />
          <Route path="/public/:companyId/products/:id" element={<ProductDetailPage />} />
          <Route path="/public/:companyId/panier" element={<PublicCartPage />} />
          <Route path="/public/:companyId/demande" element={<PublicRequestPage />} />
          
          {/* Catalogue public général avec détection automatique d'entreprise */}
          <Route path="/catalog" element={<PublicCatalogAnonymous />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/panier" element={<PublicCartPage />} />
          <Route path="/demande" element={<PublicRequestPage />} />
          
          {/* Page d'accueil avec détection d'entreprise */}
          <Route path="/" element={<SmartLandingPage />} />
          
          {/* FALLBACK POUR ROUTES NON RECONNUES */}
          <Route path="/*" element={<RoleBasedRoutes />} />
          
          {/* ROUTES PUBLIQUES AVEC SLUG - EN DERNIER POUR ÉVITER LES CONFLITS */}
          <Route path="/:companySlug/catalog" element={<PublicSlugCatalog />} />
          <Route path="/:companySlug/products/:id" element={<PublicSlugProductDetail />} />
          <Route path="/:companySlug/panier" element={<PublicSlugCart />} />
          <Route path="/:companySlug/demande" element={<PublicSlugRequest />} />
          <Route path="/:companySlug" element={<PublicSlugCompany />} />
        </Routes>
  );
};

// Composants pour les routes publiques avec slug
const PublicSlugCatalog = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  console.log('📱 PUBLIC SLUG CATALOG - Rendering for slug:', companySlug);
  
  // Vérifier si le slug est un mot-clé réservé
  const reservedKeywords = ['admin', 'ambassadors', 'client', 'clients', 'api', 'dashboard', 'login', 'register', 'contracts', 'partner', 'partners'];
  
  if (companySlug && reservedKeywords.includes(companySlug.toLowerCase())) {
    console.log('📱 PUBLIC SLUG CATALOG - Reserved keyword detected, redirecting:', companySlug);
    return <Navigate to="/" replace />;
  }
  
  return <PublicCatalogAnonymous />;
};

const PublicSlugProductDetail = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  console.log('📱 PUBLIC SLUG PRODUCT - Rendering for slug:', companySlug);
  
  return <ProductDetailPage />;
};

const PublicSlugCart = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  console.log('📱 PUBLIC SLUG CART - Rendering for slug:', companySlug);
  
  return <PublicCartPage />;
};

const PublicSlugRequest = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  console.log('📱 PUBLIC SLUG REQUEST - Rendering for slug:', companySlug);
  
  return <PublicRequestPage />;
};

const PublicSlugCompany = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  console.log('📱 PUBLIC SLUG COMPANY - Rendering for slug:', companySlug);
  
  return <SmartCompanyPage />;
};

// Composant intelligent pour la page d'accueil
const SmartLandingPage = () => {
  console.log('🏠 SMART LANDING - Using default landing page');
  
  // Afficher la landing page générale (système de slug utilisé maintenant)
  return <LandingPage />;
};

// Composant intelligent pour détecter une entreprise par slug
const SmartCompanyPage = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  console.log('🏢 SMART COMPANY PAGE - Rendering with slug:', companySlug);
  
  // Chercher l'entreprise par son slug
  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company-by-slug', companySlug],
    queryFn: async () => {
      if (!companySlug) return null;
      
      console.log('🏢 SMART COMPANY PAGE - Fetching company for slug:', companySlug);
      
      const { data, error } = await supabase
        .rpc('get_company_by_slug', { company_slug: companySlug });
      
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!companySlug,
  });
  
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
  
  if (error || !company) {
    console.error('🏢 SMART COMPANY PAGE - Error or no company:', { error, company });
    return <Navigate to="/" replace />;
  }
  
  // Si une entreprise est trouvée, afficher sa landing page
  return <PublicCompanyLanding />;
};

const RoleBasedRoutes = () => {
  const { user, isAdmin, isClient, isPartner, isAmbassador } = useAuth();
  const location = useLocation();

  console.log('🔐 ROLE BASED ROUTES - Processing:', {
    pathname: location.pathname,
    hasUser: !!user,
    userEmail: user?.email
  });

  // Vérifier si l'URL contient un slug d'entreprise potentiel
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const isCompanySlugPath = pathSegments.length >= 1 && 
    !['admin', 'dashboard', 'clients', 'offers', 'contracts', 'settings', 'crm', 'ambassadors', 'partners'].includes(pathSegments[0]);

  console.log('🔐 ROLE BASED ROUTES - Path analysis:', {
    pathSegments,
    isCompanySlugPath,
    shouldBypass: isCompanySlugPath
  });

  // Si c'est potentiellement un slug d'entreprise, ne pas traiter par les routes admin
  if (isCompanySlugPath) {
    console.log('🔐 ROLE BASED ROUTES - Bypassing for potential company slug');
    return <Navigate to="/" replace />;
  }

  // Si pas d'utilisateur connecté, rediriger vers login
  if (!user) {
    console.log('🔐 ROLE BASED ROUTES - No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('🔐 ROLE BASED ROUTES - User roles:', {
    isClient: isClient(),
    isAmbassador: isAmbassador(),
    isPartner: isPartner(),
    isAdmin: isAdmin()
  });

  // Routage selon le rôle principal de l'utilisateur
  if (isClient()) {
    console.log('🔐 ROLE BASED ROUTES - Routing to ClientRoutes');
    return <ClientRoutes />;
  }

  if (isAmbassador()) {
    console.log('🔐 ROLE BASED ROUTES - Routing to AmbassadorRoutes');
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
    console.log('🔐 ROLE BASED ROUTES - Routing to PartnerRoutes');
    return <PartnerRoutes />;
  }

  // Par défaut (admin ou utilisateur sans rôle spécifique), utiliser l'interface admin
  console.log('🔐 ROLE BASED ROUTES - Routing to Admin Layout');
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
        <Route path="/contracts/:id" element={<ContractDetail />} />
        <Route path="/admin/contracts/:id" element={<ContractDetail />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/company/settings" element={<CompanySettingsPage />} />
        <Route path="/crm" element={<CRMPage />} />
        <Route path="/admin/catalog" element={<CatalogManagement />} />
        <Route path="/catalog/edit/:id" element={<ProductFormPage />} />
        <Route path="/admin/catalog/edit/:id" element={<ProductFormPage />} />
        <Route path="/partners/edit/:id" element={<PartnerEditPage />} />
        <Route path="/admin/partners/edit/:id" element={<PartnerEditPage />} />
        
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
