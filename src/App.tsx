

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
import AmbassadorCreatePage from "./pages/AmbassadorCreatePage";
import Clients from "./pages/Clients";
import CreateOffer from "./pages/CreateOffer";
import Offers from "./pages/Offers";
import Contracts from "./pages/Contracts";
import Settings from "./pages/Settings";

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
            <Route path="/admin/dashboard" element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/admin/clients" element={
              <PrivateRoute>
                <Layout>
                  <Clients />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/admin/offers" element={
              <PrivateRoute>
                <Layout>
                  <Offers />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/admin/create-offer" element={
              <PrivateRoute>
                <Layout>
                  <CreateOffer />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/admin/contracts" element={
              <PrivateRoute>
                <Layout>
                  <Contracts />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/admin/settings" element={
              <PrivateRoute>
                <Layout>
                  <Settings />
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
            <Route path="/admin/catalog" element={
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
            <Route path="/admin/catalog/edit/:id" element={
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
            <Route path="/admin/partners/edit/:id" element={
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
            <Route path="/ambassadors/create" element={
              <PrivateRoute>
                <Layout>
                  <AmbassadorCreatePage />
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

