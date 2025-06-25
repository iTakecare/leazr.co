
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyBrandingProvider } from "@/context/CompanyBrandingContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import Login from "@/pages/Login";
import OfferDocumentUpload from "@/pages/OfferDocumentUpload";
import Dashboard from "@/pages/Dashboard";
import Offers from "@/pages/Offers";
import CreateOffer from "@/pages/CreateOffer";
import Clients from "@/pages/Clients";
import Contracts from "@/pages/Contracts";
import Settings from "@/pages/Settings";
import AdminOfferDetail from "@/pages/AdminOfferDetail";
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
                  
                  {/* Protected routes */}
                  <Route path="/" element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/dashboard" element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/admin/dashboard" element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/offers" element={
                    <PrivateRoute>
                      <Offers />
                    </PrivateRoute>
                  } />
                  <Route path="/admin/offers" element={
                    <PrivateRoute>
                      <Offers />
                    </PrivateRoute>
                  } />
                  <Route path="/offers/:id" element={
                    <PrivateRoute>
                      <AdminOfferDetail />
                    </PrivateRoute>
                  } />
                  <Route path="/admin/offers/:id" element={
                    <PrivateRoute>
                      <AdminOfferDetail />
                    </PrivateRoute>
                  } />
                  <Route path="/create-offer" element={
                    <PrivateRoute>
                      <CreateOffer />
                    </PrivateRoute>
                  } />
                  <Route path="/clients" element={
                    <PrivateRoute>
                      <Clients />
                    </PrivateRoute>
                  } />
                  <Route path="/admin/clients" element={
                    <PrivateRoute>
                      <Clients />
                    </PrivateRoute>
                  } />
                  <Route path="/contracts" element={
                    <PrivateRoute>
                      <Contracts />
                    </PrivateRoute>
                  } />
                  <Route path="/admin/contracts" element={
                    <PrivateRoute>
                      <Contracts />
                    </PrivateRoute>
                  } />
                  <Route path="/settings" element={
                    <PrivateRoute>
                      <Settings />
                    </PrivateRoute>
                  } />
                  <Route path="/admin/settings" element={
                    <PrivateRoute>
                      <Settings />
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
