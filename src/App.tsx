
import { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/providers/theme-provider";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Layout } from "./components/layout/Layout";
import './utils/initializeITakecare'; // This will execute the initialization
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import LeazrClients from "./pages/LeazrClients";
import LeazrSaaSDashboard from "./pages/LeazrSaaSDashboard";
import LeazrSaaSClients from "./pages/LeazrSaaSClients";
import LeazrSaaSSubscriptions from "./pages/LeazrSaaSSubscriptions";
import LeazrSaaSSupport from "./pages/LeazrSaaSSupport";
import LeazrSaaSPlans from "./pages/LeazrSaaSPlans";
import LeazrSaaSSettings from "./pages/LeazrSaaSSettings";
import Offers from "./pages/Offers";
import Contracts from "./pages/Contracts";
import CatalogManagement from "./pages/CatalogManagement";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import CreateLeazrAdmin from "./pages/CreateLeazrAdmin";
import HomePage from "./pages/HomePage";
import { useAuth } from "./context/AuthContext";

// Create a simple PrivateRoute component inline since the original doesn't export properly
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Composant pour gérer la redirection de l'admin SaaS
const DashboardRedirect = () => {
  const { user } = useAuth();
  
  // Si l'utilisateur est l'admin SaaS, rediriger vers le dashboard SaaS
  if (user?.email === "ecommerce@itakecare.be") {
    return <Navigate to="/leazr-saas-dashboard" replace />;
  }
  
  // Sinon, afficher le dashboard normal
  return <Dashboard />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AuthProvider>
          <CartProvider>
            <Router>
              <div className="min-h-screen bg-background font-sans antialiased">
                <Routes>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/create-leazr-admin" element={<CreateLeazrAdmin />} />

                  {/* Protected routes with Layout */}
                  <Route 
                    path="/*" 
                    element={
                      <PrivateRoute>
                        <Layout>
                          <Routes>
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<DashboardRedirect />} />
                            <Route path="clients" element={<Clients />} />
                            <Route path="leazr-clients" element={<LeazrClients />} />
                            <Route path="leazr-saas-dashboard" element={<LeazrSaaSDashboard />} />
                            <Route path="leazr-saas-clients" element={<LeazrSaaSClients />} />
                            <Route path="leazr-saas-subscriptions" element={<LeazrSaaSSubscriptions />} />
                            <Route path="leazr-saas-support" element={<LeazrSaaSSupport />} />
                            <Route path="leazr-saas-plans" element={<LeazrSaaSPlans />} />
                            <Route path="leazr-saas-settings" element={<LeazrSaaSSettings />} />
                            <Route path="clients/:clientId" element={<Clients />} />
                            <Route path="offers" element={<Offers />} />
                            <Route path="contracts" element={<Contracts />} />
                            <Route path="catalog" element={<CatalogManagement />} />
                            <Route path="settings" element={<Settings />} />
                          </Routes>
                        </Layout>
                      </PrivateRoute>
                    } 
                  />
                </Routes>
                <Toaster />
                <ShadcnToaster />
              </div>
            </Router>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
