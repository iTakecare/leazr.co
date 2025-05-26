import { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/providers/theme-provider";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import Layout from "./components/layout/Layout";
import PrivateRoute from "./components/PrivateRoute";
import './utils/initializeITakecare'; // This will execute the initialization
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import LeazrClients from "./pages/LeazrClients";
import Offers from "./pages/Offers";
import Contracts from "./pages/Contracts";
import Catalog from "./pages/Catalog";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import Profile from "./pages/Profile";
import Partners from "./pages/Partners";
import Ambassadors from "./pages/Ambassadors";
import OfferDetails from "./pages/OfferDetails";
import ContractDetails from "./pages/ContractDetails";
import { useAuth } from "./context/AuthContext";
import { useEffect } from "react";

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
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/pricing" element={<Pricing />} />

                  <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="leazr-clients" element={<LeazrClients />} />
                    <Route path="clients/:clientId" element={<Clients />} />
                    <Route path="partners" element={<Partners />} />
                    <Route path="ambassadors" element={<Ambassadors />} />
                    <Route path="offers" element={<Offers />} />
                    <Route path="offers/:offerId" element={<OfferDetails />} />
                    <Route path="contracts" element={<Contracts />} />
                    <Route path="contracts/:contractId" element={<ContractDetails />} />
                    <Route path="catalog" element={<Catalog />} />
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
