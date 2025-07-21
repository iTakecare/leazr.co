
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { MultiTenantProvider } from "@/context/MultiTenantContext";
import { CompanyBrandingProvider } from "@/context/CompanyBrandingContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/components/theme-provider";
import { RoleBasedRoutes } from "@/components/auth/RoleBasedRoutes";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AmbassadorRoute } from "@/components/auth/AmbassadorRoute";
import { ClientRoute } from "@/components/auth/ClientRoute";
import { PartnerRoute } from "@/components/auth/PartnerRoute";

// Auth pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import EmailConfirmation from "@/pages/EmailConfirmation";
import Welcome from "@/pages/Welcome";

// Public pages
import HomePage from "@/pages/HomePage";
import BlogPage from "@/pages/BlogPage";
import BlogDetailPage from "@/pages/BlogDetailPage";
import PublicCatalogAnonymous from "@/pages/PublicCatalogAnonymous";
import PublicProductDetails from "@/pages/PublicProductDetails";
import PublicCartPage from "@/pages/PublicCartPage";
import PublicRequestStepsPage from "@/pages/PublicRequestStepsPage";

// Public slug-based pages
import PublicSlugCatalog from "@/components/public/PublicSlugCatalog";
import PublicSlugProductDetails from "@/components/public/PublicSlugProductDetails";
import PublicSlugCart from "@/components/public/PublicSlugCart";
import PublicSlugRequestSteps from "@/components/public/PublicSlugRequestSteps";

// Admin pages
import AdminDashboard from "@/pages/AdminDashboard";
import AdminClients from "@/pages/AdminClients";
import AdminOffers from "@/pages/AdminOffers";
import AdminContracts from "@/pages/AdminContracts";
import AdminCatalog from "@/pages/AdminCatalog";
import AdminProductPage from "@/pages/AdminProductPage";
import AdminSettings from "@/pages/AdminSettings";
import AdminUsers from "@/pages/AdminUsers";
import AdminCommissions from "@/pages/AdminCommissions";
import AdminAmbassadors from "@/pages/AdminAmbassadors";
import AdminPartners from "@/pages/AdminPartners";
import AdminLeasers from "@/pages/AdminLeasers";
import AdminBlog from "@/pages/AdminBlog";
import AdminBlogEdit from "@/pages/AdminBlogEdit";
import AdminWooCommerceSetup from "@/pages/AdminWooCommerceSetup";
import AdminModules from "@/pages/AdminModules";
import AdminEmailTemplates from "@/pages/AdminEmailTemplates";
import AdminCMS from "@/pages/AdminCMS";
import AdminBusiness from "@/pages/AdminBusiness";
import AdminChat from "@/pages/AdminChat";
import AdminChatSettings from "@/pages/AdminChatSettings";
import AdminIntegrations from "@/pages/AdminIntegrations";
import AdminReports from "@/pages/AdminReports";
import AdminDomains from "@/pages/AdminDomains";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminOffersPage from "@/pages/AdminOffersPage";
import AdminEditOffer from "@/pages/AdminEditOffer";
import AdminCreateOffer from "@/pages/AdminCreateOffer";
import AdminClientsPage from "@/pages/AdminClientsPage";
import AdminContractsPage from "@/pages/AdminContractsPage";
import AdminCatalogPage from "@/pages/AdminCatalogPage";
import AdminCreateProduct from "@/pages/AdminCreateProduct";
import AdminEditProduct from "@/pages/AdminEditProduct";
import AdminSettingsPage from "@/pages/AdminSettingsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminAmbassadorsPage from "@/pages/AdminAmbassadorsPage";
import AdminPartnersPage from "@/pages/AdminPartnersPage";
import AdminLeasersPage from "@/pages/AdminLeasersPage";
import AdminCommissionsPage from "@/pages/AdminCommissionsPage";
import AdminBlogPage from "@/pages/AdminBlogPage";
import AdminBlogEditPage from "@/pages/AdminBlogEditPage";
import AdminCMSPage from "@/pages/AdminCMSPage";
import AdminBusinessPage from "@/pages/AdminBusinessPage";
import AdminChatPage from "@/pages/AdminChatPage";
import AdminChatSettingsPage from "@/pages/AdminChatSettingsPage";
import AdminIntegrationsPage from "@/pages/AdminIntegrationsPage";
import AdminReportsPage from "@/pages/AdminReportsPage";
import AdminDomainsPage from "@/pages/AdminDomainsPage";
import AdminModulesPage from "@/pages/AdminModulesPage";
import AdminEmailTemplatesPage from "@/pages/AdminEmailTemplatesPage";

// Ambassador pages
import AmbassadorDashboard from "@/pages/AmbassadorDashboard";
import AmbassadorClients from "@/pages/AmbassadorClients";
import AmbassadorCommissions from "@/pages/AmbassadorCommissions";
import AmbassadorReports from "@/pages/AmbassadorReports";
import AmbassadorProfile from "@/pages/AmbassadorProfile";

// Client pages
import ClientDashboard from "@/pages/ClientDashboard";
import ClientContracts from "@/pages/ClientContracts";
import ClientContractDetails from "@/pages/ClientContractDetails";
import ClientProfile from "@/pages/ClientProfile";
import ClientOffersPage from "@/pages/ClientOffersPage";
import ClientOfferDetails from "@/pages/ClientOfferDetails";

// Partner pages
import PartnerDashboard from "@/pages/PartnerDashboard";
import PartnerClients from "@/pages/PartnerClients";
import PartnerCommissions from "@/pages/PartnerCommissions";
import PartnerReports from "@/pages/PartnerReports";
import PartnerProfile from "@/pages/PartnerProfile";

// Special pages
import ProspectRegistration from "@/pages/ProspectRegistration";
import ProspectSuccess from "@/pages/ProspectSuccess";
import ProspectConfirmation from "@/pages/ProspectConfirmation";
import CompanyEmailConfirmation from "@/pages/CompanyEmailConfirmation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <MultiTenantProvider>
                <CompanyBrandingProvider>
                  <CartProvider>
                    <Routes>
                      {/* PRIORITY: Company slug-based routes - MUST be first */}
                      <Route path="/:companySlug/catalog" element={<PublicSlugCatalog />} />
                      <Route path="/:companySlug/products/:productId" element={<PublicSlugProductDetails />} />
                      <Route path="/:companySlug/panier" element={<PublicSlugCart />} />
                      <Route path="/:companySlug/demande" element={<PublicSlugRequestSteps />} />
                      
                      {/* Authentication routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/email-confirmation" element={<EmailConfirmation />} />
                      <Route path="/welcome" element={<Welcome />} />
                      
                      {/* Public routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/blog" element={<BlogPage />} />
                      <Route path="/blog/:slug" element={<BlogDetailPage />} />
                      <Route path="/catalog/anonymous/:companyId" element={<PublicCatalogAnonymous />} />
                      <Route path="/public/:companyId" element={<PublicCatalogAnonymous />} />
                      <Route path="/public/:companyId/products/:productId" element={<PublicProductDetails />} />
                      <Route path="/public/:companyId/panier" element={<PublicCartPage />} />
                      <Route path="/public/:companyId/demande" element={<PublicRequestStepsPage />} />
                      
                      {/* Prospect routes */}
                      <Route path="/prospect/register" element={<ProspectRegistration />} />
                      <Route path="/prospect/success" element={<ProspectSuccess />} />
                      <Route path="/prospect/confirmation" element={<ProspectConfirmation />} />
                      <Route path="/company/email-confirmation" element={<CompanyEmailConfirmation />} />
                      
                      {/* Protected routes */}
                      <Route element={<ProtectedRoute />}>
                        <Route element={<RoleBasedRoutes />}>
                          {/* Admin routes */}
                          <Route element={<AdminRoute />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                            <Route path="/admin/clients" element={<AdminClientsPage />} />
                            <Route path="/admin/offers" element={<AdminOffersPage />} />
                            <Route path="/admin/offers/create" element={<AdminCreateOffer />} />
                            <Route path="/admin/offers/edit/:id" element={<AdminEditOffer />} />
                            <Route path="/admin/contracts" element={<AdminContractsPage />} />
                            <Route path="/admin/catalog" element={<AdminCatalogPage />} />
                            <Route path="/admin/catalog/products/create" element={<AdminCreateProduct />} />
                            <Route path="/admin/catalog/products/:id" element={<AdminProductPage />} />
                            <Route path="/admin/catalog/products/edit/:id" element={<AdminEditProduct />} />
                            <Route path="/admin/settings" element={<AdminSettingsPage />} />
                            <Route path="/admin/users" element={<AdminUsersPage />} />
                            <Route path="/admin/ambassadors" element={<AdminAmbassadorsPage />} />
                            <Route path="/admin/partners" element={<AdminPartnersPage />} />
                            <Route path="/admin/leasers" element={<AdminLeasersPage />} />
                            <Route path="/admin/commissions" element={<AdminCommissionsPage />} />
                            <Route path="/admin/blog" element={<AdminBlogPage />} />
                            <Route path="/admin/blog/edit/:id" element={<AdminBlogEditPage />} />
                            <Route path="/admin/cms" element={<AdminCMSPage />} />
                            <Route path="/admin/business" element={<AdminBusinessPage />} />
                            <Route path="/admin/chat" element={<AdminChatPage />} />
                            <Route path="/admin/chat/settings" element={<AdminChatSettingsPage />} />
                            <Route path="/admin/integrations" element={<AdminIntegrationsPage />} />
                            <Route path="/admin/reports" element={<AdminReportsPage />} />
                            <Route path="/admin/domains" element={<AdminDomainsPage />} />
                            <Route path="/admin/modules" element={<AdminModulesPage />} />
                            <Route path="/admin/email-templates" element={<AdminEmailTemplatesPage />} />
                            <Route path="/admin/woocommerce-setup" element={<AdminWooCommerceSetup />} />
                          </Route>
                          
                          {/* Ambassador routes */}
                          <Route element={<AmbassadorRoute />}>
                            <Route path="/ambassador" element={<AmbassadorDashboard />} />
                            <Route path="/ambassador/clients" element={<AmbassadorClients />} />
                            <Route path="/ambassador/commissions" element={<AmbassadorCommissions />} />
                            <Route path="/ambassador/reports" element={<AmbassadorReports />} />
                            <Route path="/ambassador/profile" element={<AmbassadorProfile />} />
                          </Route>
                          
                          {/* Client routes */}
                          <Route element={<ClientRoute />}>
                            <Route path="/client" element={<ClientDashboard />} />
                            <Route path="/client/contracts" element={<ClientContracts />} />
                            <Route path="/client/contracts/:id" element={<ClientContractDetails />} />
                            <Route path="/client/profile" element={<ClientProfile />} />
                            <Route path="/client/offers" element={<ClientOffersPage />} />
                            <Route path="/client/offers/:id" element={<ClientOfferDetails />} />
                          </Route>
                          
                          {/* Partner routes */}
                          <Route element={<PartnerRoute />}>
                            <Route path="/partner" element={<PartnerDashboard />} />
                            <Route path="/partner/clients" element={<PartnerClients />} />
                            <Route path="/partner/commissions" element={<PartnerCommissions />} />
                            <Route path="/partner/reports" element={<PartnerReports />} />
                            <Route path="/partner/profile" element={<PartnerProfile />} />
                          </Route>
                        </Route>
                      </Route>
                    </Routes>
                  </CartProvider>
                </CompanyBrandingProvider>
              </MultiTenantProvider>
            </AuthProvider>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
