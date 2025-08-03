import React from "react";
import { Routes, Route } from "react-router-dom";
import PartnerDashboard from "@/pages/PartnerDashboard";
import PartnerCreateOffer from "@/pages/PartnerCreateOffer";
import PartnerClientsPage from "@/pages/PartnerPages/PartnerClientsPage";
import PartnerClientCreatePage from "@/pages/PartnerPages/PartnerClientCreatePage";

const PartnerRoutes = () => {
  return (
    <div className="min-h-screen flex w-full">
      {/* TODO: Créer PartnerSidebar */}
      <div className="w-64 bg-card border-r">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Interface Partenaire</h2>
        </div>
      </div>
      
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="dashboard" element={<PartnerDashboard />} />
          <Route path="create-offer" element={<PartnerCreateOffer />} />
          <Route path="clients" element={<PartnerClientsPage />} />
          <Route path="clients/create" element={<PartnerClientCreatePage />} />
          {/* Redirection par défaut vers le dashboard */}
          <Route path="" element={<PartnerDashboard />} />
          <Route path="*" element={<PartnerDashboard />} />
        </Routes>
      </main>
    </div>
  );
};

export default PartnerRoutes;