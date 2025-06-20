import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyBrandingProvider } from './contexts/CompanyBrandingContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ContractsPage from './pages/ContractsPage';
import SettingsPage from './pages/SettingsPage';
import PricingPage from './pages/PricingPage';
import LandingPage from './pages/LandingPage';
import SolutionsPage from './pages/SolutionsPage';
import ContactPage from './pages/ContactPage';
import ServicesPage from './pages/ServicesPage';
import RessourcesPage from './pages/RessourcesPage';
import NotFoundPage from './pages/NotFoundPage';
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
              <Route path="/ressources" element={<RessourcesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </CompanyBrandingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
