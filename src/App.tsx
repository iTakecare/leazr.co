
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
import Home from "@/pages/Home";

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
