import React, { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Offers from '@/pages/Offers';
import CreateOffer from '@/pages/CreateOffer';
import EditOffer from '@/pages/EditOffer';
import Clients from '@/pages/Clients';
import ClientDetails from '@/pages/ClientDetails';
import CreateClient from '@/pages/CreateClient';
import EditClient from '@/pages/EditClient';
import Products from '@/pages/Products';
import ProductDetails from '@/pages/ProductDetails';
import CreateProduct from '@/pages/CreateProduct';
import EditProduct from '@/pages/EditProduct';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import Users from '@/pages/Users';
import CreateUser from '@/pages/CreateUser';
import EditUser from '@/pages/EditUser';
import Ambassadors from '@/pages/Ambassadors';
import AmbassadorDetails from '@/pages/AmbassadorDetails';
import CreateAmbassador from '@/pages/CreateAmbassador';
import EditAmbassador from '@/pages/EditAmbassador';
import AmbassadorOffers from '@/pages/AmbassadorOffers';
import AmbassadorCreateOffer from '@/pages/AmbassadorCreateOffer';
import AmbassadorEditOffer from '@/pages/AmbassadorEditOffer';
import PartnerDashboard from '@/pages/PartnerDashboard';
import PartnerCreateOffer from '@/pages/PartnerCreateOffer';
import Leasers from '@/pages/Leasers';
import CreateLeaser from '@/pages/CreateLeaser';
import EditLeaser from '@/pages/EditLeaser';
import CommissionLevels from '@/pages/CommissionLevels';
import CreateCommissionLevel from '@/pages/CreateCommissionLevel';
import EditCommissionLevel from '@/pages/EditCommissionLevel';
import TestAttributesPage from '@/pages/TestAttributesPage';

function App() {
  const { isLoggedIn, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
    const authRoutes = ['/', '/offers', '/clients', '/products', '/profile', '/settings', '/users', '/ambassadors', '/ambassador/offers', '/partner/dashboard'];
    const partnerRoutes = ['/partner/dashboard'];
    const ambassadorRoutes = ['/ambassador/offers'];

    if (!isLoggedIn() && authRoutes.includes(location.pathname)) {
      navigate('/login');
    }

    if (isLoggedIn() && publicRoutes.includes(location.pathname)) {
      navigate('/');
    }

    if (!isAdmin() && location.pathname.startsWith('/users')) {
      navigate('/');
    }

    if (!isAdmin() && location.pathname.startsWith('/products') && !partnerRoutes.includes(location.pathname)) {
      navigate('/');
    }

    if (!isAdmin() && location.pathname.startsWith('/clients') && !ambassadorRoutes.includes(location.pathname)) {
      navigate('/');
    }

    if (!isAdmin() && location.pathname.startsWith('/ambassadors')) {
      navigate('/');
    }
  }, [isLoggedIn, location, navigate, isAdmin]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Home />} />
      <Route path="/offers" element={<Offers />} />
      <Route path="/offers/create" element={<CreateOffer />} />
      <Route path="/offers/:id/edit" element={<EditOffer />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/clients/:id" element={<ClientDetails />} />
      <Route path="/clients/create" element={<CreateClient />} />
      <Route path="/clients/:id/edit" element={<EditClient />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:id" element={<ProductDetails />} />
      <Route path="/products/create" element={<CreateProduct />} />
      <Route path="/products/:id/edit" element={<EditProduct />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/users" element={<Users />} />
      <Route path="/users/create" element={<CreateUser />} />
      <Route path="/users/:id/edit" element={<EditUser />} />
      <Route path="/ambassadors" element={<Ambassadors />} />
      <Route path="/ambassadors/:id" element={<AmbassadorDetails />} />
      <Route path="/ambassadors/create" element={<CreateAmbassador />} />
      <Route path="/ambassadors/:id/edit" element={<EditAmbassador />} />
      <Route path="/ambassador/offers" element={<AmbassadorOffers />} />
      <Route path="/ambassador/:ambassadorId/offers/create" element={<AmbassadorCreateOffer />} />
      <Route path="/ambassador/:ambassadorId/offers/:id/edit" element={<AmbassadorEditOffer />} />
      <Route path="/ambassador/:ambassadorId/client/:clientId/offers/create" element={<AmbassadorCreateOffer />} />
      <Route path="/partner/dashboard" element={<PartnerDashboard />} />
      <Route path="/partner/offers/create" element={<PartnerCreateOffer />} />
      <Route path="/leasers" element={<Leasers />} />
      <Route path="/leasers/create" element={<CreateLeaser />} />
      <Route path="/leasers/:id/edit" element={<EditLeaser />} />
      <Route path="/commission-levels" element={<CommissionLevels />} />
      <Route path="/commission-levels/create" element={<CreateCommissionLevel />} />
      <Route path="/commission-levels/:id/edit" element={<EditCommissionLevel />} />
      
      {/* Route de test pour les attributs et spécifications */}
      <Route path="/test-attributes" element={<TestAttributesPage />} />
    </Routes>
  );
}

export default App;
