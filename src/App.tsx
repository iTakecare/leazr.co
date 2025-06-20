
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { CompanyBrandingProvider } from './context/CompanyBrandingContext';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import DashboardPage from './pages/Dashboard';
import ClientsPage from './pages/Clients';
import ContractsPage from './pages/Contracts';
import SettingsPage from './pages/Settings';
import PricingPage from './pages/PricingPage';
import LandingPage from './pages/LandingPage';
import SolutionsPage from './pages/SolutionsPage';
import ContactPage from './pages/ContactPage';
import ServicesPage from './pages/ServicesPage';
import ResourcesPage from './pages/ResourcesPage';
import NotFoundPage from './pages/NotFound';
import UnifiedSolutionsPage from '@/pages/UnifiedSolutionsPage';

function App() {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    document.title = "Leazr - Votre solution de leasing";
  }, []);

  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CompanyBrandingProvider>
            <Toaster />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/tarifs" element={<PricingPage />} />
              <Route path="/solutions" element={<UnifiedSolutionsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/ressources" element={<ResourcesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </CompanyBrandingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
