
import { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/providers/theme-provider";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Layout } from "./components/layout/Layout";
import './utils/initializeITakecare'; // This will execute the initialization
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import LeazrClients from "./pages/LeazrClients";
import Offers from "./pages/Offers";
import Contracts from "./pages/Contracts";
import CatalogManagement from "./pages/CatalogManagement";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import { useAuth } from "./context/AuthContext";
import { useEffect } from "react";

// Create a simple PrivateRoute component inline since the original doesn't export properly
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AuthProvider>
          <CartProvider>
            <Router>
              <div className="min-h-screen bg-background font-sans antialiased">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />

                  <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="leazr-clients" element={<LeazrClients />} />
                    <Route path="clients/:clientId" element={<Clients />} />
                    <Route path="offers" element={<Offers />} />
                    <Route path="contracts" element={<Contracts />} />
                    <Route path="catalog" element={<CatalogManagement />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Routes>
                <Toaster />
                <ShadcnToaster />
              </div>
            </Router>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
