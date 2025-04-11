
import React, { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Login from '@/pages/Login';
import Offers from '@/pages/Offers';
import CreateOffer from '@/pages/CreateOffer';
import Clients from '@/pages/Clients';
import Settings from '@/pages/Settings';
import PartnerDashboard from '@/pages/PartnerDashboard';
import PartnerCreateOffer from '@/pages/PartnerCreateOffer';
import TestAttributesPage from '@/pages/TestAttributesPage';

function App() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const publicRoutes = ['/login'];
    const authRoutes = ['/', '/offers', '/clients', '/profile', '/settings', '/partner/dashboard'];
    const partnerRoutes = ['/partner/dashboard'];

    if (!user && authRoutes.includes(location.pathname)) {
      navigate('/login');
    }

    if (user && publicRoutes.includes(location.pathname)) {
      navigate('/');
    }

    if (!isAdmin() && location.pathname.startsWith('/users')) {
      navigate('/');
    }

    if (!isAdmin() && location.pathname.startsWith('/products') && !partnerRoutes.includes(location.pathname)) {
      navigate('/');
    }

    if (!isAdmin() && location.pathname.startsWith('/clients') && location.pathname !== '/clients') {
      navigate('/');
    }

    if (!isAdmin() && location.pathname.startsWith('/ambassadors')) {
      navigate('/');
    }
  }, [user, location, navigate, isAdmin]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PartnerDashboard />} />
      <Route path="/offers" element={<Offers />} />
      <Route path="/offers/create" element={<CreateOffer />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/partner/dashboard" element={<PartnerDashboard />} />
      <Route path="/partner/offers/create" element={<PartnerCreateOffer />} />
      
      {/* Route de test pour les attributs et spécifications */}
      <Route path="/test-attributes" element={<TestAttributesPage />} />
    </Routes>
  );
}

export default App;
