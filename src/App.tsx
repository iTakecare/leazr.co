
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { PrivateRoute } from "@/components/PrivateRoute";
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/catalog" element={
              <PrivateRoute requiredRole="admin">
                <CatalogManagement />
              </PrivateRoute>
            } />
            <Route path="/catalog/edit/:id" element={
              <PrivateRoute requiredRole="admin">
                <ProductEditPage />
              </PrivateRoute>
            } />
            <Route path="/partners/edit/:id" element={
              <PrivateRoute>
                <PartnerEditPage />
              </PrivateRoute>
            } />
            <Route path="/ambassador/catalog" element={
              <PrivateRoute>
                <AmbassadorCatalog />
              </PrivateRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
