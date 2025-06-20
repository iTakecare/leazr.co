
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AmbassadorSidebar from "./AmbassadorSidebar";
import AmbassadorDashboardPage from "@/pages/AmbassadorPages/AmbassadorDashboardPage";
import AmbassadorCatalog from "@/pages/AmbassadorCatalog";
import AmbassadorCreateOffer from "@/pages/AmbassadorCreateOffer";
import PublicCatalogMultiTenant from "@/pages/PublicCatalogMultiTenant";
import AmbassadorClientsPage from "@/pages/AmbassadorPages/AmbassadorClientsPage";
import AmbassadorOffersPage from "@/pages/AmbassadorPages/AmbassadorOffersPage";

const AmbassadorRoutes = () => {
  return (
    <div className="min-h-screen flex w-full">
      <AmbassadorSidebar />
      <main className="flex-1 ml-64 overflow-auto">
        <Routes>
          <Route path="dashboard" element={<AmbassadorDashboardPage />} />
          <Route path="catalog" element={<PublicCatalogMultiTenant />} />
          <Route path="ambassador/create-offer" element={<AmbassadorCreateOffer />} />
          <Route path="ambassador/clients" element={<AmbassadorClientsPage />} />
          <Route path="ambassador/offers" element={<AmbassadorOffersPage />} />
          {/* Redirection par défaut vers le dashboard */}
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AmbassadorRoutes;
