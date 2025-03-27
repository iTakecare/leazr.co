
import { Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/context/AuthContext";
import "./App.css";

import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ClientForm from "./pages/ClientForm";
import PartnersList from "./pages/PartnersList";
import PartnerDetail from "./pages/PartnerDetail";
import PartnerCreatePage from "./pages/PartnerCreatePage";
import PartnerEditPage from "./pages/PartnerEditPage";
import AmbassadorsList from "./pages/AmbassadorsList";
import AmbassadorDetail from "./pages/AmbassadorDetail";
import AmbassadorCreatePage from "./pages/AmbassadorCreatePage";
import AmbassadorEditPage from "./pages/AmbassadorEditPage";
import CatalogManagement from "./pages/CatalogManagement";
import ProductDetailPage from "./pages/ProductDetailPage";
import PublicCatalog from "./pages/PublicCatalog";
import CreateOffer from "./pages/CreateOffer";
import PartnerCreateOffer from "./pages/PartnerCreateOffer";
import AmbassadorCreateOffer from "./pages/AmbassadorCreateOffer";
import Offers from "./pages/Offers";
import OfferDetail from "./pages/OfferDetail";
import PartnerOfferDetail from "./pages/PartnerOfferDetail";
import AmbassadorPages from "./pages/AmbassadorPages/AmbassadorDashboardPage";
import AmbassadorClientsPage from "./pages/AmbassadorPages/AmbassadorClientsPage";
import AmbassadorClientCreatePage from "./pages/AmbassadorPages/AmbassadorClientCreatePage";
import AmbassadorOffersPage from "./pages/AmbassadorPages/AmbassadorOffersPage";
import AmbassadorOfferDetail from "./pages/AmbassadorPages/AmbassadorOfferDetail";
import ClientDashboard from "./pages/ClientDashboard";
import ClientRequestsPage from "./pages/ClientRequestsPage";
import ClientContractsPage from "./pages/ClientContractsPage";
import ClientITakecarePage from "./pages/ClientITakecarePage";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail";
import SignOffer from "./pages/client/SignOffer";
import RequestSentPage from "./pages/RequestSentPage";
import Settings from "./pages/Settings";
import PartnerDashboard from "./pages/PartnerDashboard";
import ITakecarePage from "./pages/ITakecarePage";
import CreateTestUsers from "./pages/CreateTestUsers";

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/request-sent" element={<RequestSentPage />} />
            <Route path="/create-test-users" element={<CreateTestUsers />} />
            
            {/* Admin routes */}
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/catalog" element={<Layout><CatalogManagement /></Layout>} />
            <Route path="/catalog/:productId" element={<Layout><ProductDetailPage /></Layout>} />
            <Route path="/clients" element={<Layout><Clients /></Layout>} />
            <Route path="/clients/new" element={<Layout><ClientForm /></Layout>} />
            <Route path="/clients/:clientId" element={<Layout><ClientDetail /></Layout>} />
            <Route path="/partners" element={<Layout><PartnersList /></Layout>} />
            <Route path="/partners/new" element={<Layout><PartnerCreatePage /></Layout>} />
            <Route path="/partners/:partnerId" element={<Layout><PartnerDetail /></Layout>} />
            <Route path="/partners/:partnerId/edit" element={<Layout><PartnerEditPage /></Layout>} />
            <Route path="/ambassadors" element={<Layout><AmbassadorsList /></Layout>} />
            <Route path="/ambassadors/new" element={<Layout><AmbassadorCreatePage /></Layout>} />
            <Route path="/ambassadors/:ambassadorId" element={<Layout><AmbassadorDetail /></Layout>} />
            <Route path="/ambassadors/:ambassadorId/edit" element={<Layout><AmbassadorEditPage /></Layout>} />
            <Route path="/create-offer" element={<Layout><CreateOffer /></Layout>} />
            <Route path="/offers" element={<Layout><Offers /></Layout>} />
            <Route path="/offers/:offerId" element={<Layout><OfferDetail /></Layout>} />
            <Route path="/contracts" element={<Layout><Contracts /></Layout>} />
            <Route path="/contracts/:contractId" element={<Layout><ContractDetail /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/i-take-care" element={<Layout><ITakecarePage /></Layout>} />
            
            {/* Partner routes */}
            <Route path="/partner/dashboard" element={<Layout><PartnerDashboard /></Layout>} />
            <Route path="/partner/create-offer" element={<Layout><PartnerCreateOffer /></Layout>} />
            <Route path="/partner/offers/:offerId" element={<Layout><PartnerOfferDetail /></Layout>} />
            
            {/* Ambassador routes */}
            <Route path="/ambassador/dashboard" element={<Layout><AmbassadorPages /></Layout>} />
            <Route path="/ambassador/clients" element={<Layout><AmbassadorClientsPage /></Layout>} />
            <Route path="/ambassador/clients/new" element={<Layout><AmbassadorClientCreatePage /></Layout>} />
            <Route path="/ambassador/create-offer" element={<Layout><AmbassadorCreateOffer /></Layout>} />
            <Route path="/ambassador/offers" element={<Layout><AmbassadorOffersPage /></Layout>} />
            <Route path="/ambassador/offers/:offerId" element={<Layout><AmbassadorOfferDetail /></Layout>} />
            
            {/* Client routes */}
            <Route path="/client/dashboard" element={<Layout><ClientDashboard /></Layout>} />
            <Route path="/client/requests" element={<Layout><ClientRequestsPage /></Layout>} />
            <Route path="/client/contracts" element={<Layout><ClientContractsPage /></Layout>} />
            <Route path="/client/i-take-care" element={<Layout><ClientITakecarePage /></Layout>} />
            
            {/* Public routes */}
            <Route path="/public/catalog" element={<PublicCatalog />} />
            <Route path="/client/sign-offer/:offerId" element={<SignOffer />} />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <SonnerToaster position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
