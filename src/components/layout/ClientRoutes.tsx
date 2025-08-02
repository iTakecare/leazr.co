
import React from "react";
import { Routes, Route } from "react-router-dom";
import ClientSidebar from "./ClientSidebar";
import ClientDashboard from "@/pages/ClientDashboard";
import ClientContractsPage from "@/pages/ClientContractsPage";
import ClientRequestsPage from "@/pages/ClientRequestsPage";
import ClientRequestDetailPage from "@/pages/ClientRequestDetailPage";
import ClientEquipmentPage from "@/pages/ClientEquipmentPage";
import ClientSupportPage from "@/pages/ClientSupportPage";
import ClientSettingsPage from "@/pages/ClientSettingsPage";
import ClientCartPage from "@/pages/ClientCartPage";
import ClientCartRequestPage from "@/pages/ClientCartRequestPage";
import ClientCatalogPage from "@/pages/ClientCatalogPage";
import ClientProductDetailPage from "@/pages/ClientProductDetailPage";
import ClientContractDetailPage from "@/pages/ClientContractDetailPage";

const ClientRoutes = () => {
  return (
    <div className="min-h-screen flex w-full">
      <ClientSidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="contracts" element={<ClientContractsPage />} />
          <Route path="contracts/:id" element={<ClientContractDetailPage />} />
          <Route path="requests" element={<ClientRequestsPage />} />
          <Route path="requests/:id" element={<ClientRequestDetailPage />} />
          <Route path="equipment" element={<ClientEquipmentPage />} />
          <Route path="products" element={<ClientCatalogPage />} />
          <Route path="products/:productId" element={<ClientProductDetailPage />} />
          <Route path="panier" element={<ClientCartPage />} />
          <Route path="panier/demande" element={<ClientCartRequestPage />} />
          <Route path="support" element={<ClientSupportPage />} />
          <Route path="settings" element={<ClientSettingsPage />} />
          {/* Redirection par défaut vers le dashboard */}
          <Route path="" element={<ClientDashboard />} />
          <Route path="*" element={<ClientDashboard />} />
        </Routes>
      </main>
    </div>
  );
};

export default ClientRoutes;
