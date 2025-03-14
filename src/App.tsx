
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ClientForm from "./pages/ClientForm";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import CreateOffer from "./pages/CreateOffer";
import Offers from "./pages/Offers";
import Contracts from "./pages/Contracts";
import CreateTestUsers from "./pages/CreateTestUsers";

import { Layout } from "./components/layout/Layout";
import { ThemeProvider } from "./components/providers/theme-provider";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ClientRoutes from "./components/layout/ClientRoutes";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Route guard component
const ProtectedRoute = ({ 
  children, 
  requireAdmin = false 
}: { 
  children: React.ReactNode, 
  requireAdmin?: boolean 
}) => {
  const { user, isLoading, isAdmin, isClient } = useAuth();
  const location = useLocation();

  // Check for password reset flow
  useEffect(() => {
    if (location.hash) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery') {
        console.log("Password reset detected in protected route");
      }
    }
  }, [location.hash]);
  
  if (isLoading) {
    return <div>Chargement...</div>;
  }
  
  // If we have a recovery token, we want to allow access to the login page
  if (location.hash) {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery' && location.pathname === '/login') {
      return <>{children}</>;
    }
  }
  
  if (!user) {
    // Include the hash in the redirect so login can handle the password reset token
    return <Navigate to={`/login${location.hash}`} />;
  }
  
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/client/dashboard" />;
  }
  
  // Redirect clients to client dashboard if they try to access admin routes
  if (!requireAdmin && isClient() && !window.location.pathname.startsWith('/client')) {
    return <Navigate to="/client/dashboard" />;
  }
  
  return <>{children}</>;
};

function App() {
  const location = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="medease-theme">
        <AuthProvider>
          <SonnerToaster position="top-right" />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Admin routes */}
            <Route path="/" element={
              <ProtectedRoute requireAdmin={true}>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/new" element={<ClientForm />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/clients/edit/:id" element={<ClientForm />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/catalog/:id" element={<ProductDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/create-offer" element={<CreateOffer />} />
              <Route path="/offers" element={<Offers />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/create-test-users" element={<CreateTestUsers />} />
            </Route>
            
            {/* Client routes */}
            <Route path="/client/*" element={
              <ProtectedRoute>
                <ClientRoutes />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
