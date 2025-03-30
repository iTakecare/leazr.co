
import { Routes, Route, BrowserRouter } from "react-router-dom";
import "./App.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ClientForm from "./pages/ClientForm";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CreateOffer from "./pages/CreateOffer";
import PartnerCreateOffer from "./pages/PartnerCreateOffer";
import PartnerDashboard from "./pages/PartnerDashboard";
import AmbassadorDashboard from "./pages/AmbassadorDashboard";
import AmbassadorCreateOffer from "./pages/AmbassadorCreateOffer";
import PartnerDetail from "./pages/PartnerDetail";
import PartnerCreatePage from "./pages/PartnerCreatePage";
import PartnerEditPage from "./pages/PartnerEditPage";
import PartnersList from "./pages/PartnersList";
import AmbassadorsList from "./pages/AmbassadorsList";
import AmbassadorDetail from "./pages/AmbassadorDetail";
import AmbassadorCreatePage from "./pages/AmbassadorCreatePage";
import AmbassadorEditPage from "./pages/AmbassadorEditPage";
import Offers from "./pages/Offers";
import OfferDetail from "./pages/OfferDetail";
import PartnerOfferDetail from "./pages/PartnerOfferDetail";
import ClientDashboard from "./pages/ClientDashboard";
import SignOffer from "./pages/client/SignOffer";
import ClientRequestsPage from "./pages/ClientRequestsPage";
import CatalogManagement from "./pages/CatalogManagement";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProductEditPage from "./pages/ProductEditPage";
import PublicCatalog from "./pages/PublicCatalog";
import ITakecarePage from "./pages/ITakecarePage";
import ClientITakecarePage from "./pages/ClientITakecarePage";
import RequestSentPage from "./pages/RequestSentPage";
import ClientOffers from "./pages/ClientOffers";
import ClientContractsPage from "./pages/ClientContractsPage";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail";
import AmbassadorDashboardPage from "./pages/AmbassadorPages/AmbassadorDashboardPage";
import AmbassadorClientCreatePage from "./pages/AmbassadorPages/AmbassadorClientCreatePage";
import AmbassadorClientsPage from "./pages/AmbassadorPages/AmbassadorClientsPage";
import AmbassadorOffersPage from "./pages/AmbassadorPages/AmbassadorOffersPage";
import AmbassadorOfferDetail from "./pages/AmbassadorPages/AmbassadorOfferDetail";
import AmbassadorCatalog from "./pages/AmbassadorCatalog";
import CartPage from "./pages/CartPage";
import ClientRoutes from "@/components/layout/ClientRoutes";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="light" storageKey="itakecare-theme">
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/panier" element={<CartPage />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/client/:id" element={<ClientDetail />} />
            <Route path="/client/new" element={<ClientForm />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/create-offer" element={<CreateOffer />} />
            <Route path="/partner/create-offer" element={<PartnerCreateOffer />} />
            <Route path="/partner/dashboard" element={<PartnerDashboard />} />
            <Route path="/partner/:id" element={<PartnerDetail />} />
            <Route path="/partner/new" element={<PartnerCreatePage />} />
            <Route path="/partner/:id/edit" element={<PartnerEditPage />} />
            <Route path="/partner/offer/:id" element={<PartnerOfferDetail />} />
            <Route path="/partners" element={<PartnersList />} />
            <Route path="/ambassador/dashboard" element={<AmbassadorDashboard />} />
            <Route path="/ambassador/create-offer" element={<AmbassadorCreateOffer />} />
            <Route path="/ambassador/:id" element={<AmbassadorDetail />} />
            <Route path="/ambassador/new" element={<AmbassadorCreatePage />} />
            <Route path="/ambassador/:id/edit" element={<AmbassadorEditPage />} />
            <Route path="/ambassadors" element={<AmbassadorsList />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/offer/:id" element={<OfferDetail />} />
            <Route path="/client-dashboard" element={<ClientDashboard />} />
            <Route path="/sign-offer/:id" element={<SignOffer />} />
            <Route path="/client-requests" element={<ClientRequestsPage />} />
            <Route path="/catalog" element={<CatalogManagement />} />
            <Route path="/product/:productId" element={<ProductDetailPage />} />
            <Route path="/product/edit/:productId" element={<ProductEditPage />} />
            <Route path="/catalogue" element={<PublicCatalog />} />
            <Route path="/itakecare" element={<ITakecarePage />} />
            <Route path="/client/itakecare" element={<ClientITakecarePage />} />
            <Route path="/demande-envoyee" element={<RequestSentPage />} />
            <Route path="/client/offers" element={<ClientOffers />} />
            <Route path="/client/contracts" element={<ClientContractsPage />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/contract/:id" element={<ContractDetail />} />
            <Route path="/amb/dashboard" element={<AmbassadorDashboardPage />} />
            <Route path="/amb/clients/new" element={<AmbassadorClientCreatePage />} />
            <Route path="/amb/clients" element={<AmbassadorClientsPage />} />
            <Route path="/amb/offers" element={<AmbassadorOffersPage />} />
            <Route path="/amb/offer/:id" element={<AmbassadorOfferDetail />} />
            <Route path="/amb/catalog" element={<AmbassadorCatalog />} />
            <Route path="/client/*" element={<ClientRoutes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
