import React from 'react';
import { Route, Routes } from 'react-router-dom';
import ClientDashboard from '@/pages/client/ClientDashboard';
import ClientEquipmentPage from '@/pages/client/ClientEquipmentPage';
import OfferDetail from '@/pages/client/OfferDetail';
import ContractDetail from '@/pages/client/ContractDetail';
import ClientSettingsPage from '@/pages/client/ClientSettingsPage';
import ClientITakecarePage from '@/pages/client/ClientITakecarePage';
import ClientSupportPage from '@/pages/client/ClientSupportPage';
import ClientRequestsPage from '@/pages/client/ClientRequestsPage';

/**
 * Routes pour le client
 */
const ClientRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<ClientDashboard />} />
      <Route path="equipment" element={<ClientEquipmentPage />} />
      <Route path="offers/:id" element={<OfferDetail />} />
      <Route path="contracts/:id" element={<ContractDetail />} />
      <Route path="settings" element={<ClientSettingsPage />} />
      <Route path="itakecare" element={<ClientITakecarePage />} />
      <Route path="support" element={<ClientSupportPage />} />
      <Route path="requests" element={<ClientRequestsPage />} />
      
      {/* Note: La route sign-offer/:id est maintenant définie dans App.tsx pour permettre l'accès sans authentification */}
    </Routes>
  );
};

export default ClientRoutes;
