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
        </Routes>
      </AnimatePresence>
      
      <Toaster richColors position="top-right" />
      <ShadcnToaster />
    </div>
  );
};

export default App;
