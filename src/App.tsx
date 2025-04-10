
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as SonnerToaster } from "sonner";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import AdminRoutes from "@/components/layout/AdminRoutes";
import ClientRoutes from "@/components/layout/ClientRoutes";
import AmbassadorRoutes from "@/components/layout/AmbassadorRoutes";
import PartnerRoutes from "@/components/layout/PartnerRoutes";
import NotFound from "@/pages/NotFound";
import PublicSignOffer from "@/pages/client/PublicSignOffer";
import Index from "@/pages/Index";

// Création du client de requête pour React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Route publique pour la signature d'offre */}
            <Route path="/sign/:id" element={<PublicSignOffer />} />
            
            {/* Routes protégées */}
            <Route path="/dashboard/*" element={<AdminRoutes />} />
            <Route path="/client/*" element={<ClientRoutes />} />
            <Route path="/ambassador/*" element={<AmbassadorRoutes />} />
            <Route path="/partner/*" element={<PartnerRoutes />} />
            
            {/* Redirection par défaut */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          <SonnerToaster position="top-right" />
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
