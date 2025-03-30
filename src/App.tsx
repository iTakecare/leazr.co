
import React from "react";
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ClientRoutes from "@/components/layout/ClientRoutes";
import NotFound from "./pages/NotFound";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Clients from "./pages/Clients";
import Offers from "./pages/Offers";
import Contracts from "./pages/Contracts";
import PublicCatalog from "./pages/PublicCatalog";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import RegistrationPage from "./pages/RegistrationPage";
import ConfirmationPage from "./pages/ConfirmationPage";

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isPublicPage = () => {
    const publicPaths = [
      '/',
      '/login',
      '/signup',
      '/catalogue',
      '/produits',
      '/panier',
      '/inscription',
      '/confirmation'
    ];
    
    // Vérifier si l'URL commence par un des chemins publics
    return publicPaths.some(path => 
      location.pathname === path || 
      location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <div className="h-screen w-full">
      <Toaster position="top-center" />
      <Routes>
        {/* Pages publiques */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/catalogue" element={<PublicCatalog />} />
        <Route path="/produits/:id" element={<ProductDetailPage />} />
        <Route path="/panier" element={<CartPage />} />
        <Route path="/inscription" element={<RegistrationPage />} />
        <Route path="/confirmation" element={<ConfirmationPage />} />

        {/* Routes authentifiées avec Layout */}
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="clients/*" element={<Clients />} />
          <Route path="offers/*" element={<Offers />} />
          <Route path="contracts/*" element={<Contracts />} />
        </Route>

        {/* Routes Client */}
        <Route path="/client/*" element={<ClientRoutes />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
