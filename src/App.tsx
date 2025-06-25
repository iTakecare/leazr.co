
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyBrandingProvider } from "@/context/CompanyBrandingContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import Layout from "@/components/layout/Layout";
import Login from "@/pages/Login";
import OfferDocumentUpload from "@/pages/OfferDocumentUpload";
import Dashboard from "@/pages/Dashboard";
import Offers from "@/pages/Offers";
import CreateOffer from "@/pages/CreateOffer";
import Clients from "@/pages/Clients";
import Contracts from "@/pages/Contracts";
import Settings from "@/pages/Settings";
import AdminOfferDetail from "@/pages/AdminOfferDetail";
import CatalogManagement from "@/pages/CatalogManagement";
import LeazrSaaSDashboard from "@/pages/LeazrSaaSDashboard";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <CompanyBrandingProvider>
              <Suspense fallback={<div>Loading...</div>}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/offer/documents/upload/:token" element={<OfferDocumentUpload />} />
                  
                  {/* Protected routes with Layout */}
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
                  <Route path="/offers" element={
                    <PrivateRoute>
                      <Layout>
                        <Offers />
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
                  <Route path="/offers/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <AdminOfferDetail />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/offers/:id" element={
                    <PrivateRoute>
                      <Layout>
                        <AdminOfferDetail />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/create-offer" element={
                    <PrivateRoute>
                      <Layout>
                        <CreateOffer />
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
                  <Route path="/clients" element={
                    <PrivateRoute>
                      <Layout>
                        <Clients />
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
                  <Route path="/contracts" element={
                    <PrivateRoute>
                      <Layout>
                        <Contracts />
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
                  <Route path="/admin/catalog" element={
                    <PrivateRoute>
                      <Layout>
                        <CatalogManagement />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/admin/leazr-saas-dashboard" element={
                    <PrivateRoute>
                      <Layout>
                        <LeazrSaaSDashboard />
                      </Layout>
                    </PrivateRoute>
                  } />
                  <Route path="/settings" element={
                    <PrivateRoute>
                      <Layout>
                        <Settings />
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
                </Routes>
              </Suspense>
            </CompanyBrandingProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
