
import React, { useState } from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import CatalogManagement from "@/pages/CatalogManagement";
import ProductDetailsPage from "@/pages/ProductDetailsPage";
import OfferManagement from "@/pages/OfferManagement";
import OfferDetailsPage from "@/pages/OfferDetailsPage";
import PublicCatalog from "@/pages/PublicCatalog";
import PublicProductDetails from "@/pages/PublicProductDetails";
import CatalogGroupingPage from "@/pages/CatalogGroupingPage";

function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <Routes>
            <Route path="/" element={<PublicCatalog />} />
            <Route path="/produits/:productId" element={<PublicProductDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/catalogue" element={<CatalogManagement />} />
            <Route path="/catalogue/regroupement" element={<CatalogGroupingPage />} />
            <Route path="/produit/:productId" element={<ProductDetailsPage />} />
            <Route path="/offres" element={<OfferManagement />} />
            <Route path="/offre/:offerId" element={<OfferDetailsPage />} />
          </Routes>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
