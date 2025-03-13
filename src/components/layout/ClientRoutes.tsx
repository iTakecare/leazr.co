
import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import ClientDashboard from "@/pages/ClientDashboard";
import { Layout } from "./Layout";
import { useAuth } from "@/context/AuthContext";
import ClientSidebar from "./ClientSidebar";

// Placeholder components for client routes
const ClientContracts = () => <div>Mes Contrats</div>;
const ClientEquipment = () => <div>Mes Équipements</div>;
const ClientRequests = () => <div>Mes Demandes en cours</div>;
const ClientCatalog = () => <div>Catalogue</div>;
const ClientNewRequest = () => <div>Nouvelle Demande</div>;

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <ClientSidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
};

const ClientRoutes = () => {
  const { isClient } = useAuth();

  if (!isClient()) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Routes>
      <Route path="/dashboard" element={<ClientLayout><ClientDashboard /></ClientLayout>} />
      <Route path="/contracts" element={<ClientLayout><ClientContracts /></ClientLayout>} />
      <Route path="/equipment" element={<ClientLayout><ClientEquipment /></ClientLayout>} />
      <Route path="/requests" element={<ClientLayout><ClientRequests /></ClientLayout>} />
      <Route path="/catalog" element={<ClientLayout><ClientCatalog /></ClientLayout>} />
      <Route path="/new-request" element={<ClientLayout><ClientNewRequest /></ClientLayout>} />
      <Route path="*" element={<Navigate to="/client/dashboard" />} />
    </Routes>
  );
};

export default ClientRoutes;
