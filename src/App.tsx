import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/layout/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import OffersPage from './pages/OffersPage';
import AdminOfferDetail from './pages/AdminOfferDetail';
import ClientsPage from './pages/ClientsPage';
import SettingsPage from './pages/SettingsPage';
import PublicCatalog from './pages/PublicCatalog';
import ProductDetail from './pages/ProductDetail';
import SignupForm from './pages/SignupForm';
import LoginForm from './pages/LoginForm';
import CalculatorPage from './pages/CalculatorPage';
import AmbassadorDashboard from './pages/AmbassadorPages/AmbassadorDashboard';
import AmbassadorOffers from './pages/AmbassadorPages/AmbassadorOffers';
import AmbassadorCreateOffer from './pages/AmbassadorPages/AmbassadorCreateOffer';
import AmbassadorOfferDetail from './pages/AmbassadorPages/AmbassadorOfferDetail';
import PackagesPage from './pages/PackagesPage';
import PackDetail from './pages/PackDetail';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import HelpPage from './pages/HelpPage';
import ClientOfferView from './pages/ClientOfferView';
import SignatureView from './pages/SignatureView';
import ClientLandingPage from './pages/ClientLandingPage';
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
import AmbassadorRoute from './components/AmbassadorRoute';
import PartnerRoute from './components/PartnerRoute';
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
          <Route path="/signup" element={<SignupForm />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/packs/:packType" element={<PackDetail />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/offers/client/:offerId" element={<ClientOfferView />} />
          <Route path="/client/offer/:offerId" element={<ClientOfferView />} />
          <Route path="/client/offers/:offerId" element={<ClientOfferView />} />
          <Route path="/offers/:offerId/signature" element={<SignatureView />} />
          <Route path="/c/:clientId/:passwordHash" element={<ClientLandingPage />} />
          <Route path="/check-password/:clientId" element={<ClientPasswordCheck />} />
          <Route path="/create-leazr-admin" element={<CreateLeazrAdmin />} />

          {/* Routes admin */}
          <Route path="/admin/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="offers" element={<OffersPage />} />
                  <Route path="offers/:id" element={<AdminOfferDetail />} />
                  <Route path="calculator" element={<AdminCalculator />} />
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
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
