import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyBrandingProvider } from "@/context/CompanyBrandingContext";
import { CartProvider } from "@/context/CartContext";
import { SubdomainProvider } from "@/context/SubdomainContext";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { RoleBasedRoutes } from "@/components/auth/RoleBasedRoutes";
import { PrivateRoute } from "@/components/PrivateRoute";

// Auth pages
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";

// Public pages
import HomePage from "@/pages/HomePage";
import PublicCatalogAnonymous from "@/pages/PublicCatalogAnonymous";
import PublicCartPage from "@/pages/PublicCartPage";
import ProductDetailPage from "@/pages/ProductDetailPage";

// Public slug-based pages
import PublicSlugCatalog from "@/components/public/PublicSlugCatalog";
import PublicSlugProductDetails from "@/components/public/PublicSlugProductDetails";
import PublicSlugProductBySlug from "@/components/public/PublicSlugProductBySlug";
import PublicSlugCart from "@/components/public/PublicSlugCart";
import PublicSlugRequestSteps from "@/components/public/PublicSlugRequestSteps";

// Admin pages
import Dashboard from "@/pages/Dashboard";
import AdminChatPage from "@/pages/AdminChatPage";
import Clients from "@/pages/Clients";
import Offers from "@/pages/Offers";
import Contracts from "@/pages/Contracts";
import Settings from "@/pages/Settings";
import CatalogManagement from "@/pages/CatalogManagement";
import InvoicingPage from "@/pages/InvoicingPage";

// Ambassador management pages
import AmbassadorsList from "@/pages/AmbassadorsList";
import AmbassadorDetail from "@/pages/AmbassadorDetail";
import AmbassadorEditPage from "@/pages/AmbassadorEditPage";
import AmbassadorCreatePage from "@/pages/AmbassadorCreatePage";

// Ambassador components
import AmbassadorLayout from "@/components/layout/AmbassadorLayout";
import AmbassadorRoutes from "@/components/layout/AmbassadorRoutes";

// Client offer signing
import SignOffer from "@/pages/client/SignOffer";

import ProductFormPage from "@/pages/ProductFormPage";
import Layout from "@/components/layout/Layout";

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
              <SubdomainProvider>
                <CompanyBrandingProvider>
                  <CartProvider>
                    <Routes>
                      {/* Authentication routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      
                      {/* Public routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/catalog/anonymous/:companyId" element={<PublicCatalogAnonymous />} />
                      
                      {/* Public company ID-based routes */}
                      <Route path="/public/:companyId" element={<PublicCatalogAnonymous />} />
                      <Route path="/public/:companyId/catalog" element={<PublicCatalogAnonymous />} />
                      <Route path="/public/:companyId/products/:productId" element={<ProductDetailPage />} />
                      <Route path="/public/:companyId/panier" element={<PublicCartPage />} />
                      
                      {/* Client offer signing route - needs access to providers */}
                      <Route path="/client/offer/:id/sign" element={<SignOffer />} />
                      
                      {/* Ambassador routes - MUST be before slug-based routes */}
                      <Route element={<PrivateRoute><></></PrivateRoute>}>
                        <Route path="/ambassador/*" element={<AmbassadorLayout><AmbassadorRoutes /></AmbassadorLayout>} />
                      </Route>
                      
                      {/* Protected routes - MUST be before slug-based routes */}
                      <Route element={<PrivateRoute><RoleBasedRoutes /></PrivateRoute>}>
                        {/* Admin routes with Layout */}
                        <Route path="/admin/dashboard" element={<Layout><Dashboard /></Layout>} />
                        <Route path="/admin/chat" element={<Layout><AdminChatPage /></Layout>} />
                        <Route path="/admin/clients" element={<Layout><Clients /></Layout>} />
                        <Route path="/admin/offers" element={<Layout><Offers /></Layout>} />
                        <Route path="/admin/contracts" element={<Layout><Contracts /></Layout>} />
                        <Route path="/admin/settings" element={<Layout><Settings /></Layout>} />
                        <Route path="/admin/catalog" element={<Layout><CatalogManagement /></Layout>} />
                        <Route path="/admin/invoicing" element={<Layout><InvoicingPage /></Layout>} />
                        
                        {/* Ambassador management routes */}
                        <Route path="/ambassadors" element={<Layout><AmbassadorsList /></Layout>} />
                        <Route path="/ambassadors/:id" element={<Layout><AmbassadorDetail /></Layout>} />
                        <Route path="/ambassadors/edit/:id" element={<Layout><AmbassadorEditPage /></Layout>} />
                        <Route path="/ambassadors/create" element={<Layout><AmbassadorCreatePage /></Layout>} />
                        
                        {/* Unified product form routes - handles both creation and editing */}
                        <Route path="/admin/catalog/form/:id?" element={<Layout><ProductFormPage /></Layout>} />
                        <Route path="/catalog/form/:id?" element={<Layout><ProductFormPage /></Layout>} />
                        
                        {/* Legacy redirects for backward compatibility */}
                        <Route path="/admin/catalog/create" element={<Layout><ProductFormPage /></Layout>} />
                        <Route path="/admin/catalog/edit/:id" element={<Layout><ProductFormPage /></Layout>} />
                        <Route path="/catalog/create" element={<Layout><ProductFormPage /></Layout>} />
                        <Route path="/catalog/edit/:id" element={<Layout><ProductFormPage /></Layout>} />
                        
                        {/* Default dashboard route */}
                        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                      </Route>
                      
                      {/* Company slug-based routes - MUST be after admin routes */}
                      <Route path="/:companySlug/catalog" element={<PublicSlugCatalog />} />
                      <Route path="/:companySlug/products/:productSlug" element={<PublicSlugProductBySlug />} />
                      <Route path="/:companySlug/products/:productId" element={<PublicSlugProductDetails />} />
                      <Route path="/:companySlug/panier" element={<PublicSlugCart />} />
                      <Route path="/:companySlug/demande" element={<PublicSlugRequestSteps />} />
                    </Routes>
                  </CartProvider>
                </CompanyBrandingProvider>
              </SubdomainProvider>
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
