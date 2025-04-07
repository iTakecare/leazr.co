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
import PublicSignOffer from "@/pages/client/PublicSignOffer"; // Import de la page de signature publique
import SignOffer from "@/pages/client/SignOffer"; // Page existante avec authentification
import ClientRoutes from "@/components/layout/ClientRoutes";
import AdminRoutes from "@/components/layout/AdminRoutes";
import { useAuth } from "@/context/AuthContext";
import { getUserRole } from "@/services/authService";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

function App() {
  const { isLoggedIn, setRole, setUser } = useAuth();
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
            const role = await getUserRole(user.id);
            setRole(role || "client");
            console.log("Rôle de l'utilisateur:", role);
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
    <ThemeProvider defaultTheme="light" storageKey="itakecare-theme">
      <Toaster richColors />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/cart" element={<CartPage />} />
                
                {/* Page de signature publique (sans authentification) */}
                <Route path="/client/sign-offer/:id" element={<PublicSignOffer />} />
                
                <Route path="/client/*" element={
                  isLoggedIn ? <ClientRoutes /> : <Login />
                } />
                <Route path="/admin/*" element={
                  isLoggedIn ? <AdminRoutes /> : <Login />
                } />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
