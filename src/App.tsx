
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
import { AmbassadorDashboardPage as AmbassadorDashboard } from './pages/AmbassadorPages/AmbassadorDashboardPage';
import { AmbassadorOffersPage as AmbassadorOffers } from './pages/AmbassadorPages/AmbassadorOffersPage';
import AmbassadorCreateOffer from './pages/AmbassadorPages/AmbassadorCreateOffer';
import AmbassadorOfferDetail from './pages/AmbassadorPages/AmbassadorOfferDetail';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ResourcesPage from './pages/ResourcesPage';
import ClientOfferView from './pages/client/PublicOfferView';
import SignOffer from './pages/client/SignOffer';
import ClientLandingPage from './pages/PublicCompanyLanding';
import ClientPasswordCheck from './pages/ClientPasswordCheck';
import LeazrClients from './pages/LeazrClients';
import LeazrClientDetail from './pages/LeazrClientDetail';
import LeazrClientEdit from './pages/LeazrClientEdit';
import LeazrSaaS from './pages/LeazrSaaS';
import LeazrSaaSDetail from './pages/LeazrSaaSDetail';
import LeazrSaaSEdit from './pages/LeazrSaaSEdit';
import CreateLeazrAdmin from './pages/CreateLeazrAdmin';
import AmbassadorSettings from './pages/AmbassadorPages/AmbassadorSettings';
import PartnerDashboard from './pages/PartnerDashboard';
import PartnerOfferDetail from './pages/PartnerOfferDetail';
import { AmbassadorRoute } from './components/AmbassadorRoute';
import { PartnerRoute } from './components/PartnerRoute';
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
          <Route path="/check-password/:clientId" element={<ClientPasswordCheck />} />
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
                  <Route path="leazr-clients/:id" element={<LeazrClientDetail />} />
                  <Route path="leazr-clients/:id/edit" element={<LeazrClientEdit />} />
                  <Route path="leazr-saas" element={<LeazrSaaS />} />
                  <Route path="leazr-saas/:id" element={<LeazrSaaSDetail />} />
                  <Route path="leazr-saas/:id/edit" element={<LeazrSaaSEdit />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />

          {/* Routes ambassadeur */}
          <Route path="/ambassador/*" element={
            <AmbassadorRoute>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<AmbassadorDashboard />} />
                  <Route path="offers" element={<AmbassadorOffers />} />
                  <Route path="offers/:id" element={<AmbassadorOfferDetail />} />
                  <Route path="create-offer" element={<AmbassadorCreateOffer />} />
                  <Route path="create-offer/:clientId/:ambassadorId" element={<AmbassadorCreateOffer />} />
                  <Route path="settings" element={<AmbassadorSettings />} />
                </Routes>
              </Layout>
            </AmbassadorRoute>
          } />

          {/* Routes partenaire */}
          <Route path="/partner/*" element={
            <PartnerRoute>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<PartnerDashboard />} />
                  <Route path="offer/:id" element={<PartnerOfferDetail />} />
                </Routes>
              </Layout>
            </PartnerRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
