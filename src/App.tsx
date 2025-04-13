
import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientForm from "./pages/ClientForm";
import CreateOffer from "./pages/CreateOffer";
import ClientDetail from "./pages/ClientDetail";
import { Layout } from "./components/layout/Layout";
import CatalogManagement from "./pages/CatalogManagement";
import Offers from "./pages/Offers";
import OfferDetail from "./pages/OfferDetail";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail";
import ITakecarePage from "./pages/ITakecarePage";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { ShadcnToaster } from "@/components/ui/toaster";
import ClientRoutes from "./components/layout/ClientRoutes";
import { AnimatePresence } from "framer-motion";
import Settings from "./pages/Settings";
import ProductDetailPage from "./pages/ProductDetailPage";
import { useAuth } from "@/context/AuthContext";
import Index from "./pages/Index";

import Signup from "./pages/Signup";
import PublicCatalog from "./pages/PublicCatalog";
import CartPage from "./pages/CartPage";
import RequestPage from "./pages/RequestPage";
import RequestSentPage from "./pages/RequestSentPage";
import SignOffer from "./pages/client/SignOffer";
import PublicOfferView from "./pages/client/PublicOfferView";
import ProductCreationPage from "@/components/catalog/ProductCreationPage";
import ProductEditPage from "./pages/ProductEditPage";
import ProductDetail from "./pages/ProductDetail";
import AmbassadorsList from "./pages/AmbassadorsList";
import AmbassadorCreatePage from "./pages/AmbassadorCreatePage";
import AmbassadorDetail from "./pages/AmbassadorDetail";
import AmbassadorEditPage from "./pages/AmbassadorEditPage";
import AmbassadorDashboard from "./pages/AmbassadorDashboard";
import AmbassadorCreateOffer from "./pages/AmbassadorCreateOffer";
import PartnersList from "./pages/PartnersList";
import PartnerCreatePage from "./pages/PartnerCreatePage";
import PartnerDetail from "./pages/PartnerDetail";
import PartnerEditPage from "./pages/PartnerEditPage";
import PartnerDashboard from "./pages/PartnerDashboard";
import PartnerCreateOffer from "./pages/PartnerCreateOffer";
import PartnerOfferDetail from "./pages/PartnerOfferDetail";
import CreateTestUsers from "./pages/CreateTestUsers";
import AmbassadorLayout from "./components/layout/AmbassadorLayout";
import AmbassadorDashboardPage from "./pages/AmbassadorPages/AmbassadorDashboardPage";
import AmbassadorOffersPage from "./pages/AmbassadorPages/AmbassadorOffersPage";
import AmbassadorOfferDetail from "./pages/AmbassadorPages/AmbassadorOfferDetail";
import AmbassadorClientsPage from "./pages/AmbassadorPages/AmbassadorClientsPage";
import AmbassadorClientCreatePage from "./pages/AmbassadorPages/AmbassadorClientCreatePage";
import AmbassadorCatalog from "./pages/AmbassadorCatalog";
import AmbassadorProductDetail from "./pages/AmbassadorPages/AmbassadorProductDetail";
// Import des pages de blog
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
// Import des nouvelles pages 
import SolutionsPage from "./pages/SolutionsPage";
import ServicesPage from "./pages/ServicesPage";
import DurabilitePage from "./pages/DurabilitePage";

const AdminRoute = ({ children }) => {
  const { user, isLoading, isAdmin } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }
  
  if (!user || !isAdmin()) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const PartnerRoute = ({ children }) => {
  const { user, isLoading, isPartner } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }
  
  if (!user || !isPartner()) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const AmbassadorRoute = ({ children }) => {
  const { user, isLoading, isAmbassador } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }
  
  if (!user || !isAmbassador()) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const App = () => {
  const location = useLocation();
  
  console.log("App rendering - current route:", location.pathname);

  return (
    <div>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Page d'accueil - Définition explicite et prioritaire */}
          <Route index element={<Index />} />
          <Route path="/" element={<Index />} />
          
          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/catalogue" element={<PublicCatalog />} />
          <Route path="/panier" element={<CartPage />} />
          <Route path="/demande" element={<RequestPage />} />
          <Route path="/demande-envoyee" element={<RequestSentPage />} />
          <Route path="/request-sent" element={<Navigate to="/demande-envoyee" replace />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/produits/:id" element={<ProductDetailPage />} />
          <Route path="/client/sign-offer/:id" element={<SignOffer />} />
          <Route path="/client/offers/:id" element={<PublicOfferView />} />
          
          {/* Nouvelles routes pour les pages principales */}
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/solutions/location" element={<SolutionsPage />} />
          <Route path="/solutions/gestion-parc" element={<SolutionsPage />} />
          <Route path="/solutions/cloud" element={<SolutionsPage />} />
          <Route path="/solutions/reconditionnement" element={<SolutionsPage />} />
          
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/entreprises" element={<ServicesPage />} />
          <Route path="/services/professionnels" element={<ServicesPage />} />
          <Route path="/services/formations" element={<ServicesPage />} />
          <Route path="/services/support" element={<ServicesPage />} />
          
          <Route path="/durabilite" element={<DurabilitePage />} />
          <Route path="/durabilite/engagement" element={<DurabilitePage />} />
          <Route path="/durabilite/economie-circulaire" element={<DurabilitePage />} />
          <Route path="/durabilite/impact" element={<DurabilitePage />} />
          
          {/* Routes de blog */}
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          
          {/* Routes admin protégées */}
          <Route path="/" element={
            <AdminRoute>
              <Layout />
            </AdminRoute>
          }>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/new" element={<ClientForm />} />
            <Route path="clients/create" element={<ClientForm />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="clients/edit/:id" element={<ClientForm />} />
            <Route path="clients/:id/create-offer" element={<CreateOffer />} />
            <Route path="catalog" element={<CatalogManagement />} />
            <Route path="catalog/create-product" element={<ProductCreationPage />} />
            <Route path="catalog/edit/:id" element={<ProductEditPage />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="offers" element={<Offers />} />
            <Route path="offers/:id" element={<OfferDetail />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="contracts/:id" element={<ContractDetail />} />
            <Route path="i-take-care" element={<ITakecarePage />} />
            <Route path="settings" element={<Settings />} />
            <Route path="create-offer" element={<CreateOffer />} />
            
            <Route path="ambassadors" element={<AmbassadorsList />} />
            <Route path="ambassadors/create" element={<AmbassadorCreatePage />} />
            <Route path="ambassadors/:id" element={<AmbassadorDetail />} />
            <Route path="ambassadors/:id/edit" element={<AmbassadorEditPage />} />
            <Route path="ambassadors/:id/dashboard" element={<AmbassadorDashboard />} />
            <Route path="ambassadors/:id/create-offer/:clientId" element={<AmbassadorCreateOffer />} />
            
            <Route path="partners" element={<PartnersList />} />
            <Route path="partners/create" element={<PartnerCreatePage />} />
            <Route path="partners/:id" element={<PartnerDetail />} />
            <Route path="partners/:id/edit" element={<PartnerEditPage />} />
            <Route path="partners/:id/dashboard" element={<PartnerDashboard />} />
            <Route path="partners/:id/create-offer/:clientId" element={<PartnerCreateOffer />} />
            <Route path="partners/:id/offers/:offerId" element={<PartnerOfferDetail />} />
            
            <Route path="create-test-users" element={<CreateTestUsers />} />
          </Route>
          
          <Route path="/client/*" element={<ClientRoutes />} />
          
          <Route path="/ambassador" element={
            <AmbassadorRoute>
              <AmbassadorLayout />
            </AmbassadorRoute>
          }>
            <Route index element={<Navigate to="/ambassador/dashboard" replace />} />
            <Route path="dashboard" element={<AmbassadorDashboardPage />} />
            <Route path="offers" element={<AmbassadorOffersPage />} />
            <Route path="offers/:id" element={<AmbassadorOfferDetail />} />
            <Route path="clients" element={<AmbassadorClientsPage />} />
            <Route path="clients/new" element={<ClientForm isAmbassador={true} />} />
            <Route path="clients/create" element={<AmbassadorClientCreatePage />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="clients/edit/:id" element={<ClientForm isAmbassador={true} />} />
            <Route path="create-offer" element={<AmbassadorCreateOffer />} />
            <Route path="create-offer/:clientId" element={<AmbassadorCreateOffer />} />
            <Route path="catalog" element={<AmbassadorCatalog />} />
            <Route path="catalog/:productId" element={<AmbassadorProductDetail />} />
          </Route>
          
          <Route path="/partner" element={
            <PartnerRoute>
              <PartnerDashboard />
            </PartnerRoute>
          } />
          <Route path="/partner/dashboard" element={
            <PartnerRoute>
              <PartnerDashboard />
            </PartnerRoute>
          } />
          <Route path="/partner/offers" element={
            <PartnerRoute>
              <Offers />
            </PartnerRoute>
          } />
          <Route path="/partner/clients" element={
            <PartnerRoute>
              <Clients />
            </PartnerRoute>
          } />
          
          <Route path="/create-offer" element={<CreateOffer />} />
          <Route path="/calculator" element={<CreateOffer />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
      
      <Toaster richColors position="top-right" />
      <ShadcnToaster />
    </div>
  );
};

export default App;
