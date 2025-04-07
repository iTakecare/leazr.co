
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import ClientDashboard from '@/pages/client/ClientDashboard';
import ClientEquipmentPage from '@/pages/client/ClientEquipmentPage';
import ClientRequestsPage from '@/pages/client/ClientRequestsPage';
import ClientSettingsPage from '@/pages/client/ClientSettingsPage';
import ClientSupportPage from '@/pages/client/ClientSupportPage';
import SignOffer from '@/pages/client/SignOffer';
import ClientLayout from '@/components/layout/ClientLayout';

/**
 * Routes pour les clients
 */
const ClientRoutes = () => {
  return (
    <ClientLayout>
      <Routes>
        <Route path="dashboard" element={<ClientDashboard />} />
        <Route path="equipment" element={<ClientEquipmentPage />} />
        <Route path="requests" element={<ClientRequestsPage />} />
        <Route path="settings" element={<ClientSettingsPage />} />
        <Route path="support" element={<ClientSupportPage />} />
        <Route path="sign-offer/:id" element={<SignOffer />} />
      </Routes>
    </ClientLayout>
  );
};

export default ClientRoutes;
