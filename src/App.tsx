import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
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
import { ThemeProvider } from "./components/providers/theme-provider";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import ClientRoutes from "./components/layout/ClientRoutes";
import { AnimatePresence } from "framer-motion";
import Settings from "./pages/Settings";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductDetailPage from "./pages/ProductDetailPage";
import { AuthProvider } from "@/context/AuthContext";
import AmbassadorCreatePage from "./pages/AmbassadorCreatePage";
import AmbassadorEditPage from "./pages/AmbassadorEditPage";
import AmbassadorDetail from "./pages/AmbassadorDetail";
import AmbassadorsList from "./pages/AmbassadorsList";
import PartnersList from "./pages/PartnersList";
import PartnerCreatePage from "./pages/PartnerCreatePage";
import PartnerEditPage from "./pages/PartnerEditPage";
import PartnerDetail from "./pages/PartnerDetail";
import PartnerOfferDetail from "./pages/PartnerOfferDetail";
import AmbassadorCreateOffer from "./pages/AmbassadorCreateOffer";
import PartnerCreateOffer from "./pages/PartnerCreateOffer";
import AmbassadorDashboard from "./pages/AmbassadorDashboard";
import PartnerDashboard from "./pages/PartnerDashboard";
import CreateTestUsers from "./pages/CreateTestUsers";
import Signup from "./pages/Signup";
import ProductCreationPage from "@/components/catalog/ProductCreationPage";
import ProductDetail from "./pages/ProductDetail";
import AmbassadorDashboardPage from "./pages/AmbassadorPages/AmbassadorDashboardPage";
import AmbassadorOffersPage from "./pages/AmbassadorPages/AmbassadorOffersPage";
import AmbassadorClientsPage from "./pages/AmbassadorPages/AmbassadorClientsPage";
import AmbassadorLayout from "./components/layout/AmbassadorLayout";
import AmbassadorCatalog from "./pages/AmbassadorCatalog";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const location = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="itakecareapp-theme">
        <AuthProvider>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Routes Admin */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="clients" element={<Clients />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="clients/:id/create-offer" element={<CreateOffer />} />
                <Route path="catalog" element={<CatalogManagement />} />
                <Route path="catalog/create-product" element={<ProductCreationPage />} />
                <Route path="products/:id" element={<ProductDetail />} />
                <Route path="offers" element={<Offers />} />
                <Route path="offers/:id" element={<OfferDetail />} />
                <Route path="contracts" element={<Contracts />} />
                <Route path="contracts/:id" element={<ContractDetail />} />
                <Route path="i-take-care" element={<ITakecarePage />} />
                <Route path="settings" element={<Settings />} />
                <Route path="create-offer" element={<CreateOffer />} />
                
                {/* Routes ambassadeurs */}
                <Route path="ambassadors" element={<AmbassadorsList />} />
                <Route path="ambassadors/create" element={<AmbassadorCreatePage />} />
                <Route path="ambassadors/:id" element={<AmbassadorDetail />} />
                <Route path="ambassadors/:id/edit" element={<AmbassadorEditPage />} />
                <Route path="ambassadors/:id/dashboard" element={<AmbassadorDashboard />} />
                <Route path="ambassadors/:id/create-offer/:clientId" element={<AmbassadorCreateOffer />} />
                
                {/* Routes partenaires */}
                <Route path="partners" element={<PartnersList />} />
                <Route path="partners/create" element={<PartnerCreatePage />} />
                <Route path="partners/:id" element={<PartnerDetail />} />
                <Route path="partners/:id/edit" element={<PartnerEditPage />} />
                <Route path="partners/:id/dashboard" element={<PartnerDashboard />} />
                <Route path="partners/:id/create-offer/:clientId" element={<PartnerCreateOffer />} />
                <Route path="partners/:id/offers/:offerId" element={<PartnerOfferDetail />} />
                
                {/* Route pour création de comptes de test */}
                <Route path="create-test-users" element={<CreateTestUsers />} />
              </Route>
              
              {/* Routes clients */}
              <Route path="/client/*" element={<ClientRoutes />} />
              
              {/* Routes ambassador */}
              <Route path="/ambassador" element={<AmbassadorLayout />}>
                <Route index element={<AmbassadorDashboardPage />} />
                <Route path="dashboard" element={<AmbassadorDashboardPage />} />
                <Route path="offers" element={<AmbassadorOffersPage />} />
                <Route path="offers/:id" element={<OfferDetail />} />
                <Route path="clients" element={<AmbassadorClientsPage />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="create-offer" element={<AmbassadorCreateOffer />} />
                <Route path="create-offer/:clientId" element={<AmbassadorCreateOffer />} />
                <Route path="catalog" element={<AmbassadorCatalog />} />
              </Route>
              
              {/* Routes partner login */}
              <Route path="/partner/dashboard" element={<PartnerDashboard />} />
              <Route path="/partner/offers" element={<Offers />} />
              <Route path="/partner/clients" element={<Clients />} />
              <Route path="/partner" element={<PartnerDashboard />} />
              
              {/* Route spéciale pour le calculateur directement accessible */}
              <Route path="/create-offer" element={<CreateOffer />} />
              <Route path="/calculator" element={<CreateOffer />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
          
          <Toaster richColors position="top-right" />
          <ShadcnToaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
