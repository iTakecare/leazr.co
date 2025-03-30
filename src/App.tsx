
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/providers/theme-provider";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import CatalogManagement from "@/pages/CatalogManagement";
import AmbassadorCatalog from "@/pages/AmbassadorCatalog";
import PublicCatalog from "@/pages/PublicCatalog";
import ProductDetailPage from "@/pages/ProductDetailPage";
import Cart from "@/pages/Cart";
import SignupBusiness from "@/pages/SignupBusiness";

// Simple Home component since it was missing
const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6">iTakecare Portal</h1>
      <p className="mb-4">Bienvenue sur le portail iTakecare.</p>
      <div className="flex flex-wrap gap-4 mt-8">
        <a href="/catalogue" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition">
          Voir le catalogue
        </a>
        <a href="/login" className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition">
          Se connecter
        </a>
      </div>
    </div>
  );
};

export default function App() {
  const queryClient = new QueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" attribute="class">
          <CartProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/catalogue-management" element={<CatalogManagement />} />
                <Route path="/ambassador-catalog" element={<AmbassadorCatalog />} />
                <Route path="/catalogue" element={<PublicCatalog />} />
                <Route path="/produits/:id" element={<ProductDetailPage />} />
                <Route path="/panier" element={<Cart />} />
                <Route path="/signup-business" element={<SignupBusiness />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
