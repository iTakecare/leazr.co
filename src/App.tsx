import { Route, Routes, Navigate, useLocation, Outlet } from "react-router-dom";
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
import OfferDetail from "./pages/OfferDetail";
import Contracts from "./pages/Contracts";
import CreateTestUsers from "./pages/CreateTestUsers";
import PartnerDashboard from "./pages/PartnerDashboard";
import PartnerCreateOffer from "./pages/PartnerCreateOffer";
import PartnerOfferDetail from "./pages/PartnerOfferDetail";
import PartnerDetail from "./pages/PartnerDetail";
import PartnerEditPage from "./pages/PartnerEditPage";
import AmbassadorDetail from "./pages/AmbassadorDetail";
import AmbassadorEditPage from "./pages/AmbassadorEditPage";
import AmbassadorCreatePage from "./pages/AmbassadorCreatePage";
import AmbassadorsListPage from "./pages/AmbassadorsList";
import ContractDetail from "./pages/ContractDetail";
import Calculator from "./pages/Calculator";
import PartnerCreatePage from "./pages/PartnerCreatePage";
import PartnersListPage from "./pages/PartnersList";
import AmbassadorDashboard from "./pages/AmbassadorDashboard";

import { Layout } from "./components/layout/Layout";
import { ThemeProvider } from "./components/providers/theme-provider";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ClientRoutes from "./components/layout/ClientRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const ProtectedRoute = ({ 
  children, 
  requireAdmin = false,
  requirePartner = false,
  requireAmbassador = false
}: { 
  children: React.ReactNode, 
  requireAdmin?: boolean,
  requirePartner?: boolean,
  requireAmbassador?: boolean
}) => {
  const { user, isLoading, isAdmin, isClient, isPartner, isAmbassador, userRoleChecked } = useAuth();
  const location = useLocation();

  const isPasswordResetFlow = () => {
    const hash = location.hash || window.location.hash;
    return hash && hash.includes('type=recovery');
  };

  useEffect(() => {
    if (isPasswordResetFlow()) {
      console.log("Flux de réinitialisation de mot de passe détecté dans ProtectedRoute");
    }
  }, [location]);

  if (isLoading || !userRoleChecked) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  if (isPasswordResetFlow()) {
    console.log("Redirection vers login pour la réinitialisation de mot de passe");
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    console.log("Utilisateur non connecté, redirection vers login");
    return <Navigate to="/login" />;
  }

  console.log("Vérification des accès:", {
    email: user.email,
    isAdmin: isAdmin(),
    isPartner: isPartner(),
    isAmbassador: isAmbassador(),
    isClient: isClient(),
    requireAdmin,
    requirePartner,
    requireAmbassador,
    userRoleChecked,
    partner_id: user.partner_id,
    ambassador_id: user.ambassador_id
  });

  if (requireAdmin && !isAdmin()) {
    console.log("Accès admin requis mais utilisateur non admin, redirection");
    if (isPartner()) {
      return <Navigate to="/partner/dashboard" />;
    }
    if (isAmbassador()) {
      return <Navigate to="/ambassador/dashboard" />;
    }
    return <Navigate to="/client/dashboard" />;
  }

  if (requirePartner && !isPartner()) {
    console.log("Accès partenaire requis mais utilisateur non partenaire, redirection");
    if (isAdmin()) {
      return <Navigate to="/dashboard" />;
    }
    if (isAmbassador()) {
      return <Navigate to="/ambassador/dashboard" />;
    }
    return <Navigate to="/client/dashboard" />;
  }

  if (requireAmbassador && !isAmbassador()) {
    console.log("Accès ambassadeur requis mais utilisateur non ambassadeur, redirection");
    if (isAdmin()) {
      return <Navigate to="/dashboard" />;
    }
    if (isPartner()) {
      return <Navigate to="/partner/dashboard" />;
    }
    return <Navigate to="/client/dashboard" />;
  }

  if (!requireAdmin && !requirePartner && !requireAmbassador && isClient() && !window.location.pathname.startsWith('/client')) {
    console.log("Client tentant d'accéder à une route admin, redirection");
    return <Navigate to="/client/dashboard" />;
  }

  if (isPartner() && window.location.pathname === '/') {
    console.log("Partenaire connecté sur la page d'accueil, redirection vers le tableau de bord partenaire");
    return <Navigate to="/partner/dashboard" />;
  }

  if (isAmbassador() && window.location.pathname === '/') {
    console.log("Ambassadeur connecté sur la page d'accueil, redirection vers le tableau de bord ambassadeur");
    return <Navigate to="/ambassador/dashboard" />;
  }

  return <>{children}</>;
};

const PartnerLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">iTakecare Partner</h1>
          </div>
          
          <nav className="flex items-center gap-6">
            <a href="/partner/dashboard" className="text-gray-700 hover:text-blue-700">Tableau de bord</a>
            <a href="/partner/create-offer" className="text-gray-700 hover:text-blue-700">Nouvelle offre</a>
            <a href="/logout" className="text-gray-700 hover:text-blue-700">Déconnexion</a>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

const AmbassadorLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">iTakecare Ambassadeur</h1>
          </div>
          
          <nav className="flex items-center gap-6">
            <a href="/ambassador/dashboard" className="text-gray-700 hover:text-blue-700">Tableau de bord</a>
            <a href="/ambassador/create-client" className="text-gray-700 hover:text-blue-700">Créer un client</a>
            <a href="/ambassador/calculator" className="text-gray-700 hover:text-blue-700">Calculateur</a>
            <a href="/logout" className="text-gray-700 hover:text-blue-700">Déconnexion</a>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

function App() {
  const location = useLocation();

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
            
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
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
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/create-offer" element={<CreateOffer />} />
              <Route path="/offers" element={<Offers />} />
              <Route path="/offers/:id" element={<OfferDetail />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/contracts/:id" element={<ContractDetail />} />
              <Route path="/create-test-users" element={<CreateTestUsers />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/partners" element={<PartnersListPage />} />
              <Route path="/partners/create" element={<PartnerCreatePage />} />
              <Route path="/partners/:id" element={<PartnerDetail />} />
              <Route path="/partners/edit/:id" element={<PartnerEditPage />} />
              <Route path="/ambassadors" element={<AmbassadorsListPage />} />
              <Route path="/ambassadors/create" element={<AmbassadorCreatePage />} />
              <Route path="/ambassadors/:id" element={<AmbassadorDetail />} />
              <Route path="/ambassadors/edit/:id" element={<AmbassadorEditPage />} />
            </Route>
            
            <Route path="/partner" element={
              <ProtectedRoute requirePartner={true}>
                <PartnerLayout>
                  <Outlet />
                </PartnerLayout>
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<PartnerDashboard />} />
              <Route path="create-offer" element={<PartnerCreateOffer />} />
              <Route path="offers/:id" element={<PartnerOfferDetail />} />
            </Route>
            
            <Route path="/ambassador" element={
              <ProtectedRoute requireAmbassador={true}>
                <AmbassadorLayout>
                  <Outlet />
                </AmbassadorLayout>
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<AmbassadorDashboard />} />
              <Route path="create-client" element={<AmbassadorCreateClient />} />
              <Route path="calculator" element={<AmbassadorCalculator />} />
              <Route path="clients" element={<div>Clients de l'ambassadeur</div>} />
              <Route path="commissions" element={<div>Commissions de l'ambassadeur</div>} />
            </Route>
            
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
