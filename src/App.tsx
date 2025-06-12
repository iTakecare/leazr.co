
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import Layout from "@/components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CatalogManagement from "./pages/CatalogManagement";
import ProductEditPage from "./pages/ProductEditPage";
import PartnerEditPage from "./pages/PartnerEditPage";
import AmbassadorCatalog from "./pages/AmbassadorCatalog";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/catalog" element={
              <PrivateRoute requiredRole="admin">
                <Layout>
                  <CatalogManagement />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/catalog/edit/:id" element={
              <PrivateRoute requiredRole="admin">
                <Layout>
                  <ProductEditPage />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/partners/edit/:id" element={
              <PrivateRoute>
                <Layout>
                  <PartnerEditPage />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/ambassador/catalog" element={
              <PrivateRoute>
                <Layout>
                  <AmbassadorCatalog />
                </Layout>
              </PrivateRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
