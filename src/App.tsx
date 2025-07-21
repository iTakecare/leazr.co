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

// Public slug-based pages
import PublicSlugCatalog from "@/components/public/PublicSlugCatalog";
import PublicSlugProductDetails from "@/components/public/PublicSlugProductDetails";
import PublicSlugCart from "@/components/public/PublicSlugCart";
import PublicSlugRequestSteps from "@/components/public/PublicSlugRequestSteps";

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
                    {/* PRIORITY: Company slug-based routes - MUST be first */}
                    <Route path="/:companySlug/catalog" element={<PublicSlugCatalog />} />
                    <Route path="/:companySlug/products/:productId" element={<PublicSlugProductDetails />} />
                    <Route path="/:companySlug/panier" element={<PublicSlugCart />} />
                    <Route path="/:companySlug/demande" element={<PublicSlugRequestSteps />} />
                    
                    {/* Authentication routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    
                    {/* Public routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/catalog/anonymous/:companyId" element={<PublicCatalogAnonymous />} />
                    <Route path="/public/:companyId" element={<PublicCatalogAnonymous />} />
                    
                    {/* Protected routes */}
                    <Route element={<PrivateRoute><RoleBasedRoutes /></PrivateRoute>} />
                    
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