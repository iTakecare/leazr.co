
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyBrandingProvider } from "@/context/CompanyBrandingContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PrivateRoute } from "@/components/PrivateRoute";
import MultiTenantRouter from "@/components/layout/MultiTenantRouter";
import Layout from "@/components/layout/Layout";

// Auth pages
import SignupPage from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import UpdatePassword from "@/pages/UpdatePassword";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Offers from "@/pages/Offers";
import OfferDetail from "@/pages/OfferDetail";
import CreateOffer from "@/pages/CreateOffer";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Settings from "@/pages/Settings";
import Contracts from "@/pages/Contracts";
import ContractDetail from "@/pages/ContractDetail";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider delayDuration={0}>
          <AuthProvider>
            <CompanyBrandingProvider>
              <CartProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/update-password" element={<UpdatePassword />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    
                    {/* Multi-tenant routes */}
                    <Route path="/:companySlug/*" element={<MultiTenantRouter />} />
                    
                    {/* Protected admin routes */}
                    <Route path="/admin" element={<PrivateRoute><Layout><Outlet /></Layout></PrivateRoute>}>
                      <Route index element={<Navigate to="/admin/dashboard" replace />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="offers" element={<Offers />} />
                      <Route path="offers/:id" element={<OfferDetail />} />
                      <Route path="create-offer" element={<CreateOffer />} />
                      <Route path="clients" element={<Clients />} />
                      <Route path="clients/:id" element={<ClientDetail />} />
                      <Route path="contracts" element={<Contracts />} />
                      <Route path="contracts/:id" element={<ContractDetail />} />
                      <Route path="settings" element={<Settings />} />
                    </Route>

                    {/* Default routes */}
                    <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <Toaster />
                </BrowserRouter>
              </CartProvider>
            </CompanyBrandingProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
