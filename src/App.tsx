
import { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Composants de page
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import CartPage from "@/pages/CartPage";
import PublicSignOffer from "@/pages/client/PublicSignOffer";
import ClientRoutes from "@/components/layout/ClientRoutes";
import { useAuth } from "@/context/AuthContext";
import AmbassadorDashboardPage from "@/pages/AmbassadorPages/AmbassadorDashboardPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000
    }
  }
});

// Create an AppContent component to use the AuthContext
const AppContent = () => {
  const { user, isLoading, userRoleChecked, isLoggedIn, setRole, setUser, setLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      const storedToken = localStorage.getItem("sb-supabase-auth-token");
      if (storedToken) {
        try {
          const tokenData = JSON.parse(storedToken);
          if (tokenData?.currentSession?.user) {
            const user = tokenData.currentSession.user;
            setUser(user);
            // Vous pourriez avoir un service pour obtenir le rôle
            // const role = await getUserRole(user.id);
            setRole("client"); // Simplifié pour cet exemple
          } else {
            setRole(null);
            setUser(null);
          }
          setLoggedIn(true);
        } catch (error) {
          console.error("Erreur lors de l'analyse du token:", error);
          setRole(null);
          setUser(null);
          setLoggedIn(false);
          localStorage.removeItem("sb-supabase-auth-token");
        }
      } else {
        setRole(null);
        setUser(null);
        setLoggedIn(false);
      }
      setLoading(false);
    };

    checkAuthentication();
  }, [setRole, setUser, setLoggedIn]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/cart" element={<CartPage />} />
      
      {/* Route publique pour consulter et signer une offre sans authentification */}
      <Route path="/client/sign-offer/:id" element={<PublicSignOffer />} />
      
      {/* Routes protégées pour l'espace client */}
      <Route path="/client/*" element={isLoggedIn ? <ClientRoutes /> : <Login />} />
      
      {/* Route spécifique pour le dashboard ambassadeur */}
      <Route path="/ambassador/dashboard" element={<AmbassadorDashboardPage />} />
      
      {/* Toutes les autres routes non définies redirigent vers la page d'accueil */}
      <Route path="*" element={<Index />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="itakecare-theme">
      <Toaster richColors />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
