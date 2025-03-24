
import React from "react";
import {
  Route,
  Routes,
} from "react-router-dom";
import { ThemeProvider } from "./components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Clients from "./pages/Clients";
import Login from "./pages/Login";
import { AuthProvider } from "./context/AuthContext";
import PartnerDashboard from "./pages/PartnerDashboard";
import PartnerOfferDetail from "./pages/PartnerOfferDetail";
import AmbassadorDashboard from "./pages/AmbassadorDashboard";
import ClientRequestsPage from "./pages/ClientRequestsPage";
import ClientOfferSignPage from "./pages/ClientOfferSignPage";
import Home from "./pages/Home";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CRM from "./pages/CRM";
import RequireAuth from "./components/auth/RequireAuth";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="itakecare-theme">
      <TooltipProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Authenticated routes */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/clients" element={<RequireAuth><Clients /></RequireAuth>} />
            <Route path="/crm" element={<RequireAuth><CRM /></RequireAuth>} />
            <Route path="/partner/dashboard" element={<RequireAuth><PartnerDashboard /></RequireAuth>} />
            <Route path="/partner/offers/:id" element={<RequireAuth><PartnerOfferDetail /></RequireAuth>} />
            <Route path="/ambassador/dashboard" element={<RequireAuth><AmbassadorDashboard /></RequireAuth>} />
            <Route path="/client/requests" element={<RequireAuth><ClientRequestsPage /></RequireAuth>} />
            
            {/* Ajout de la route pour la signature client */}
            <Route path="/client/offers/:id" element={<ClientOfferSignPage />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
