
import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import Layout from './components/layout/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Offers from './pages/Offers';
import AdminOfferDetail from './pages/AdminOfferDetail';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import PublicCatalog from './pages/PublicCatalog';
import ProductDetail from './pages/ProductDetail';
import Signup from './pages/Signup';
import Login from './pages/Login';
import CalculatorPage from './pages/CalculatorPage';
import AmbassadorDashboard from './pages/AmbassadorPages/AmbassadorDashboardPage';
import AmbassadorOffers from './pages/AmbassadorPages/AmbassadorOffersPage';
import AmbassadorCreateOffer from './pages/AmbassadorPages/AmbassadorCreateOffer';
import AmbassadorOfferDetail from './pages/AmbassadorPages/AmbassadorOfferDetail';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ResourcesPage from './pages/ResourcesPage';
import ClientOfferView from './pages/client/PublicOfferView';
import SignOffer from './pages/client/SignOffer';
import ClientLandingPage from './pages/PublicCompanyLanding';
import LeazrClients from './pages/LeazrClients';
import CreateLeazrAdmin from './pages/CreateLeazrAdmin';
import PartnerDashboard from './pages/PartnerDashboard';
import PartnerOfferDetail from './pages/PartnerOfferDetail';
import AdminCalculator from './pages/AdminCalculator';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/public-catalog" element={<PublicCatalog />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/offers/client/:offerId" element={<ClientOfferView />} />
          <Route path="/client/offer/:offerId" element={<ClientOfferView />} />
          <Route path="/client/offers/:offerId" element={<ClientOfferView />} />
          <Route path="/offers/:offerId/signature" element={<SignOffer />} />
          <Route path="/c/:clientId/:passwordHash" element={<ClientLandingPage />} />
          <Route path="/create-leazr-admin" element={<CreateLeazrAdmin />} />

          {/* Routes admin */}
          <Route path="/admin/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="offers" element={<Offers />} />
                  <Route path="offers/:id" element={<AdminOfferDetail />} />
                  <Route path="calculator" element={<AdminCalculator />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="leazr-clients" element={<LeazrClients />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />

          {/* Routes ambassadeur */}
          <Route path="/ambassador/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<AmbassadorDashboard />} />
                  <Route path="offers" element={<AmbassadorOffers />} />
                  <Route path="offers/:id" element={<AmbassadorOfferDetail />} />
                  <Route path="create-offer" element={<AmbassadorCreateOffer />} />
                  <Route path="create-offer/:clientId/:ambassadorId" element={<AmbassadorCreateOffer />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />

          {/* Routes partenaire */}
          <Route path="/partner/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<PartnerDashboard />} />
                  <Route path="offer/:id" element={<PartnerOfferDetail />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
