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

  // Priorité au flux de réinitialisation de mot de passe
  const isPasswordResetFlow = () => {
    // Vérifier à la fois dans location.hash et window.location.hash pour être sûr
    const hash = location.hash || window.location.hash;
    return hash && hash.includes('type=recovery');
  };
  
  // Journaliser si nous sommes dans un flux de réinitialisation
  useEffect(() => {
    if (isPasswordResetFlow()) {
      console.log("Flux de réinitialisation de mot de passe détecté dans ProtectedRoute");
    }
  }, [location]);
  
  // Pendant le chargement, afficher un indicateur
  if (isLoading) {
    return <div>Chargement...</div>;
  }
  
  // Si nous sommes dans un flux de réinitialisation, rediriger vers la page de connexion
  if (isPasswordResetFlow()) {
    console.log("Redirection vers login pour la réinitialisation de mot de passe");
    return <Navigate to="/login" replace />;
  }
  
  // Si l'utilisateur n'est pas connecté, rediriger vers la connexion
  if (!user) {
    console.log("Utilisateur non connecté, redirection vers login");
    return <Navigate to="/login" />;
  }
  
  // Si un admin est requis mais l'utilisateur n'est pas admin
  if (requireAdmin && !isAdmin()) {
    console.log("Accès admin requis mais utilisateur non admin, redirection");
    return <Navigate to="/client/dashboard" />;
  }
  
  // Rediriger les clients vers le tableau de bord client s'ils essaient d'accéder aux routes admin
  if (!requireAdmin && isClient() && !window.location.pathname.startsWith('/client')) {
    console.log("Client tentant d'accéder à une route admin, redirection");
    return <Navigate to="/client/dashboard" />;
  }
  
  // Tout est OK, autoriser l'accès
  return <>{children}</>;
};

function App() {
  const location = useLocation();

  // Vérifier si nous sommes dans un flux de réinitialisation de mot de passe
  useEffect(() => {
    const hash = location.hash || window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      console.log("Flux de réinitialisation de mot de passe détecté dans App.tsx");
    }
  }, [location]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="medease-theme">
        <AuthProvider>
          <SonnerToaster position="top-right" />
          <Routes>
            <Route path="/" element={<Index />} />
            
            {/* Page de connexion - toujours accessible */}
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
              <Route path="/clients/create" element={<ClientForm />} />
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
