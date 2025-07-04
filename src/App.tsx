
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyBrandingProvider } from "@/context/CompanyBrandingContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import Layout from "@/components/layout/Layout";
import AmbassadorLayout from "@/components/layout/AmbassadorLayout";

// Public website pages
import LandingPage from "@/pages/LandingPage";
import SolutionsPage from "@/pages/SolutionsPage";
import ServicesPage from "@/pages/ServicesPage";
import ResourcesPage from "@/pages/ResourcesPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import PricingPage from "@/pages/PricingPage";
import EnterprisesSolutionsPage from "@/pages/EnterprisesSolutionsPage";
import ProfessionalsSolutionsPage from "@/pages/ProfessionalsSolutionsPage";
import UnifiedSolutionsPage from "@/pages/UnifiedSolutionsPage";
import CRMFeaturePage from "@/pages/CRMFeaturePage";
import CalculatorPage from "@/pages/CalculatorPage";
import HubPage from "@/pages/HubPage";
import HomePage from "@/pages/HomePage";

// Auth pages
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import UpdatePassword from "@/pages/UpdatePassword";
import AuthCallback from "@/pages/AuthCallback";

// Public catalog and product pages
import PublicCatalog from "@/pages/PublicCatalog";
import PublicCatalogAnonymous from "@/pages/PublicCatalogAnonymous";
import PublicCatalogMultiTenant from "@/pages/PublicCatalogMultiTenant";
import PublicProductDetailPage from "@/pages/PublicProductDetailPage";
import PublicCartPage from "@/pages/PublicCartPage";
import PublicRequestPage from "@/pages/PublicRequestPage";
import RequestSentPage from "@/pages/RequestSentPage";
import PublicCompanyLanding from "@/pages/PublicCompanyLanding";

// Client pages and routes
import ClientRoutes from "@/components/layout/ClientRoutes";
import ClientRequestDetailPage from "@/pages/ClientRequestDetailPage";
import PublicOfferView from "@/pages/client/PublicOfferView";
import SignOffer from "@/pages/client/SignOffer";

// Other public pages
import OfferDocumentUpload from "@/pages/OfferDocumentUpload";

// Protected SaaS application pages
import Dashboard from "@/pages/Dashboard";
import Offers from "@/pages/Offers";
import CreateOffer from "@/pages/CreateOffer";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import ClientEditPage from "@/pages/ClientEditPage";
import Contracts from "@/pages/Contracts";
import ContractDetail from "@/pages/ContractDetail";
import Settings from "@/pages/Settings";
import AdminOfferDetail from "@/pages/AdminOfferDetail";
import InvoicingPage from "@/pages/InvoicingPage";
import InvoiceDetailPage from "@/pages/InvoiceDetailPage";
import InvoiceEditPage from "@/pages/InvoiceEditPage";
import CatalogManagement from "@/pages/CatalogManagement";
import ProductEditPage from "@/pages/ProductEditPage";
import PartnerEditPage from "@/pages/PartnerEditPage";
import PartnerDetail from "@/pages/PartnerDetail";
import LeazrSaaSDashboard from "@/pages/LeazrSaaSDashboard";
import FleetGenerator from "@/pages/FleetGenerator";

// Ambassador pages
import AmbassadorsList from "@/pages/AmbassadorsList";
import AmbassadorDetail from "@/pages/AmbassadorDetail";
import AmbassadorEditPage from "@/pages/AmbassadorEditPage";
import AmbassadorCreatePage from "@/pages/AmbassadorCreatePage";
import AmbassadorDashboardPage from "@/pages/AmbassadorPages/AmbassadorDashboardPage";
import AmbassadorClientsPage from "@/pages/AmbassadorPages/AmbassadorClientsPage";
import AmbassadorOffersPage from "@/pages/AmbassadorPages/AmbassadorOffersPage";
import AmbassadorClientCreatePage from "@/pages/AmbassadorPages/AmbassadorClientCreatePage";
import AmbassadorCreateOffer from "@/pages/AmbassadorCreateOffer";
import AmbassadorCatalog from "@/pages/AmbassadorCatalog";
import AmbassadorOfferDetail from "@/pages/AmbassadorPages/AmbassadorOfferDetail";

import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <CompanyBrandingProvider>
              <Suspense fallback={<div>Loading...</div>}>
                <Routes>
                  {/* Public Website Routes - Landing and showcase pages */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/solutions" element={<SolutionsPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/ressources" element={<ResourcesPage />} />
                  <Route path="/a-propos" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/tarifs" element={<PricingPage />} />
                  
                  {/* Specialized solution pages */}
                  <Route path="/solutions/entreprises" element={<EnterprisesSolutionsPage />} />
                  <Route path="/solutions/professionnels" element={<ProfessionalsSolutionsPage />} />
                  <Route path="/solutions/unified" element={<UnifiedSolutionsPage />} />
                  <Route path="/fonctionnalites/crm" element={<CRMFeaturePage />} />
                  <Route path="/calculateur" element={<CalculatorPage />} />
                  <Route path="/hub" element={<HubPage />} />
                  <Route path="/home" element={<HomePage />} />
                  
                  {/* Public Authentication Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/update-password" element={<UpdatePassword />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
                  {/* Public Catalog and Commerce Routes */}
                  <Route path="/catalog" element={<PublicCatalog />} />
                  <Route path="/catalog/anonymous" element={<PublicCatalogAnonymous />} />
                  <Route path="/catalog/anonymous/:companyId" element={<PublicCatalogAnonymous />} />
                  <Route path="/catalog/:companyId" element={<PublicCatalogMultiTenant />} />
                  <Route path="/public/:companyId/catalog" element={<PublicCatalogMultiTenant />} />
                  <Route path="/product/:id" element={<PublicProductDetailPage />} />
                  <Route path="/public/:companyId/products/:id" element={<PublicProductDetailPage />} />
                  <Route path="/cart" element={<PublicCartPage />} />
                  <Route path="/request" element={<PublicRequestPage />} />
                  <Route path="/request-sent" element={<RequestSentPage />} />
                  <Route path="/company/:companyId" element={<PublicCompanyLanding />} />
                  
                  {/* Client Routes */}
                  <Route path="/client/*" element={
                    <PrivateRoute>
                      <ClientRoutes />
                    </PrivateRoute>
                  } />
                  
                  
                  {/* Client Public Access Routes */}
                  <Route path="/client/offer/:id" element={<PublicOfferView />} />
                  <Route path="/client/offer/:id/sign" element={<SignOffer />} />
                  <Route path="/offer/documents/upload/:token" element={<OfferDocumentUpload />} />
                  
                  {/* Ambassador Routes */}
                  <Route path="/ambassador/dashboard" element={
                    <PrivateRoute>
                      <AmbassadorLayout>
                        <AmbassadorDashboardPage />
                      </AmbassadorLayout>
                    </PrivateRoute>
                  } />
                  <Route path="/ambassador/clients" element={
                    <PrivateRoute>
                      <AmbassadorLayout>
                        <AmbassadorClientsPage />
                      </AmbassadorLayout>
                    </PrivateRoute>
                  } />
                  <Route path="/ambassador/clients/create" element={
                    <PrivateRoute>
                      <AmbassadorLayout>
                        <AmbassadorClientCreatePage />
                      </AmbassadorLayout>
                    </PrivateRoute>
                  } />
                  <Route path="/ambassador/offers" element={
                    <PrivateRoute>
                      <AmbassadorLayout>
                        <AmbassadorOffersPage />
                      </AmbassadorLayout>
                    </PrivateRoute>
                  } />
                  <Route path="/ambassador/offers/:id" element={
                    <PrivateRoute>
                      <AmbassadorLayout>
                        <AmbassadorOfferDetail />
                      </AmbassadorLayout>
                    </PrivateRoute>
                  } />
                  <Route path="/ambassador/create-offer" element={
                    <PrivateRoute>
                      <AmbassadorLayout>
                        <AmbassadorCreateOffer />
                      </AmbassadorLayout>
                    </PrivateRoute>
                  } />
                  <Route path="/ambassador/catalog" element={
                    <PrivateRoute>
                      <AmbassadorLayout>
                        <AmbassadorCatalog />
                      </AmbassadorLayout>
                    </PrivateRoute>
                  } />
                  
                  {/* Protected SaaS Application Routes with Layout */}
                  <Route path="/dashboard" element={
                    <PrivateRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/dashboard" element={
                    <PrivateRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/offers" element={
                    <PrivateRoute>
                      <Layout>
                        <Offers />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/offers" element={
                    <PrivateRoute>
                      <Layout>
                        <Offers />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/offers/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <AdminOfferDetail />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/offers/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <AdminOfferDetail />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/create-offer" element={
                    <PrivateRoute>
                      <Layout>
                        <CreateOffer />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/create-offer" element={
                    <PrivateRoute>
                      <Layout>
                        <CreateOffer />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/clients" element={
                    <PrivateRoute>
                      <Layout>
                        <Clients />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/clients/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <ClientDetail />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/clients/edit/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <ClientEditPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/clients" element={
                    <PrivateRoute>
                      <Layout>
                        <Clients />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/contracts" element={
                    <PrivateRoute>
                      <Layout>
                        <Contracts />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/contracts/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <ContractDetail />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/contracts" element={
                    <PrivateRoute>
                      <Layout>
                        <Contracts />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/contracts/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <ContractDetail />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/invoicing" element={
                    <PrivateRoute>
                      <Layout>
                        <InvoicingPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/invoicing/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <InvoiceDetailPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/invoicing/:id/edit" element={
                    <PrivateRoute>
                      <Layout>
                        <InvoiceEditPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/catalog" element={
                    <PrivateRoute>
                      <Layout>
                        <CatalogManagement />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/catalog/edit/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <ProductEditPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/catalog/edit/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <ProductEditPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/partners/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <PartnerDetail />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/partners/edit/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <PartnerEditPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/partners/edit/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <PartnerEditPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  {/* Ambassador Routes for Admin */}
                  <Route path="/ambassadors" element={
                    <PrivateRoute>
                      <Layout>
                        <AmbassadorsList />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/ambassadors/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <AmbassadorDetail />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/ambassadors/edit/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <AmbassadorEditPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/ambassadors/create" element={
                    <PrivateRoute>
                      <Layout>
                        <AmbassadorCreatePage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/leazr-saas-dashboard" element={
                    <PrivateRoute>
                      <Layout>
                        <LeazrSaaSDashboard />
                      </Layout>
                    </PrivateRoute>
                  } />
                   <Route path="/settings" element={
                     <PrivateRoute>
                       <Layout>
                         <Settings />
                       </Layout>
                     </PrivateRoute>
                   } />
                   <Route path="/fleet-generator" element={
                     <PrivateRoute>
                       <Layout>
                         <FleetGenerator />
                       </Layout>
                     </PrivateRoute>
                   } />
                  <Route path="/admin/settings" element={
                    <PrivateRoute>
                      <Layout>
                        <Settings />
                      </Layout>
                    </PrivateRoute>
                  } />
                </Routes>
              </Suspense>
            </CompanyBrandingProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
