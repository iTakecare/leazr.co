
import React, { useState } from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import CatalogManagement from "@/pages/CatalogManagement";
import PublicCatalog from "@/pages/PublicCatalog";
import CatalogGroupingPage from "@/pages/CatalogGroupingPage";

function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <Routes>
            <Route path="/" element={<PublicCatalog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/catalogue" element={<CatalogManagement />} />
            <Route path="/catalogue/regroupement" element={<CatalogGroupingPage />} />
          </Routes>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
