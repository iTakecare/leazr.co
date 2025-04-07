
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';

/**
 * Routes pour l'administrateur
 */
const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      {/* Add other admin routes as needed */}
    </Routes>
  );
};

export default AdminRoutes;
