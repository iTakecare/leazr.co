import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyBrandingProvider } from "@/context/CompanyBrandingContext";
import { CartProvider } from "@/context/CartContext";

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

// Routing guards
import CompanySlugGuard from "@/components/routing/CompanySlugGuard";

// Admin pages
import Dashboard from "@/pages/Dashboard";
import AdminChatPage from "@/pages/AdminChatPage";
import Clients from "@/pages/Clients";
import Offers from "@/pages/Offers";
import AdminOfferDetail from "@/pages/AdminOfferDetail";
import Contracts from "@/pages/Contracts";
import Settings from "@/pages/Settings";
import CatalogManagement from "@/pages/CatalogManagement";
import CatalogImportPage from "@/pages/AdminPages/CatalogImportPage";
import InvoicingPage from "@/pages/InvoicingPage";

// Ambassador management pages
import AmbassadorsList from "@/pages/AmbassadorsList";
import AmbassadorDetail from "@/pages/AmbassadorDetail";
import AmbassadorEditPage from "@/pages/AmbassadorEditPage";
import AmbassadorCreatePage from "@/pages/AmbassadorCreatePage";

// Ambassador components
import AmbassadorLayout from "@/components/layout/AmbassadorLayout";
import AmbassadorRoutes from "@/components/layout/AmbassadorRoutes";
import AmbassadorCatalogPage from "@/pages/AmbassadorPages/AmbassadorCatalogPage";
import AmbassadorCreateOffer from "@/pages/AmbassadorCreateOffer";
import CreateOffer from "@/pages/CreateOffer";

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
                      
                      {/* System routes with explicit paths - these MUST come first */}
                      
                      {/* Explicit create-offer route for ambassadors */}
                      <Route path="/create-offer/*" element={<PrivateRoute><AmbassadorLayout><AmbassadorRoutes /></AmbassadorLayout></PrivateRoute>} />
                      
                      <Route path="/admin/*" element={<PrivateRoute><RoleBasedRoutes /></PrivateRoute>}>
                        {/* Admin routes with Layout */}
                        <Route path="dashboard" element={<Layout><Dashboard /></Layout>} />
                        <Route path="chat" element={<Layout><AdminChatPage /></Layout>} />
                        <Route path="clients" element={<Layout><Clients /></Layout>} />
                        <Route path="offers" element={<Layout><Offers /></Layout>} />
                        <Route path="offers/:id" element={<Layout><AdminOfferDetail /></Layout>} />
                        <Route path="edit-offer/:id" element={<Layout><CreateOffer /></Layout>} />
                        <Route path="contracts" element={<Layout><Contracts /></Layout>} />
                        <Route path="settings" element={<Layout><Settings /></Layout>} />
                        <Route path="catalog" element={<Layout><CatalogManagement /></Layout>} />
                        <Route path="catalog/import" element={<Layout><CatalogImportPage /></Layout>} />
                        <Route path="invoicing" element={<Layout><InvoicingPage /></Layout>} />
                        <Route path="create-offer" element={<Layout><CreateOffer /></Layout>} />
                        
                        {/* Unified product form routes - handles both creation and editing */}
                        <Route path="catalog/form/:id?" element={<Layout><ProductFormPage /></Layout>} />
                        
                        {/* Legacy redirects for backward compatibility */}
                        <Route path="catalog/create" element={<Layout><ProductFormPage /></Layout>} />
                        <Route path="catalog/edit/:id" element={<Layout><ProductFormPage /></Layout>} />
                      </Route>
                      
                      {/* Ambassador routes */}
                      <Route path="/ambassador/*" element={<PrivateRoute><AmbassadorLayout><AmbassadorRoutes /></AmbassadorLayout></PrivateRoute>} />
                      
                      {/* Ambassador management routes */}
                      <Route path="/ambassadors/*" element={<PrivateRoute><RoleBasedRoutes /></PrivateRoute>}>
                        <Route path="" element={<Layout><AmbassadorsList /></Layout>} />
                        <Route path=":id" element={<Layout><AmbassadorDetail /></Layout>} />
                        <Route path="edit/:id" element={<Layout><AmbassadorEditPage /></Layout>} />
                        <Route path="create" element={<Layout><AmbassadorCreatePage /></Layout>} />
                      </Route>
                      
                      {/* Explicit route for ambassador catalog to avoid slug interception */}
                      <Route path="/ambassador/catalog" element={<PrivateRoute><AmbassadorLayout><AmbassadorCatalogPage /></AmbassadorLayout></PrivateRoute>} />
                      
                      {/* Other protected routes */}
                      <Route element={<PrivateRoute><RoleBasedRoutes /></PrivateRoute>}>
                        {/* Legacy product form routes */}
                        <Route path="/catalog/form/:id?" element={<Layout><ProductFormPage /></Layout>} />
                        <Route path="/catalog/create" element={<Layout><ProductFormPage /></Layout>} />
                        <Route path="/catalog/edit/:id" element={<Layout><ProductFormPage /></Layout>} />
                        
                        {/* Default dashboard route */}
                        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                      </Route>
                      
                        {/* Company slug-based routes - MUST be at the end to avoid intercepting system routes */}
                        {/* Validation is handled in CompanySlugGuard component */}
                        <Route path="/:companySlug/catalog" element={<CompanySlugGuard />} />
                        <Route path="/:companySlug/products/:productSlug" element={<PublicSlugProductBySlug />} />
                        <Route path="/:companySlug/products/:productId" element={<PublicSlugProductDetails />} />
                        <Route path="/:companySlug/panier" element={<PublicSlugCart />} />
                        <Route path="/:companySlug/demande" element={<PublicSlugRequestSteps />} />
                        
                        {/* Catch-all company slug route - fallback for company pages */}
                        <Route path="/:companySlug" element={<CompanySlugGuard />} />
                     </Routes>
                </CartProvider>
              </CompanyBrandingProvider>
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
