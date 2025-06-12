
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import SignUp from "./pages/SignUp";
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
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/catalog" element={
              <ProtectedRoute requiredRole="admin">
                <CatalogManagement />
              </ProtectedRoute>
            } />
            <Route path="/catalog/edit/:id" element={
              <ProtectedRoute requiredRole="admin">
                <ProductEditPage />
              </ProtectedRoute>
            } />
            <Route path="/partners/edit/:id" element={
              <ProtectedRoute>
                <PartnerEditPage />
              </ProtectedRoute>
            } />
            <Route path="/ambassador/catalog" element={
              <ProtectedRoute>
                <AmbassadorCatalog />
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
