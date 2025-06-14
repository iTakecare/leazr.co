import React from "react";
import { Routes, Route } from "react-router-dom";
import AmbassadorSidebar from "./AmbassadorSidebar";
import AmbassadorDashboard from "@/pages/AmbassadorDashboard";
import AmbassadorCatalog from "@/pages/AmbassadorCatalog";
import AmbassadorCreateOffer from "@/pages/AmbassadorCreateOffer";

const AmbassadorRoutes = () => {
  return (
    <div className="min-h-screen flex w-full">
      <AmbassadorSidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="dashboard" element={<AmbassadorDashboard />} />
          <Route path="catalog" element={<AmbassadorCatalog />} />
          <Route path="create-offer" element={<AmbassadorCreateOffer />} />
          {/* Redirection par défaut vers le dashboard */}
          <Route path="" element={<AmbassadorDashboard />} />
          <Route path="*" element={<AmbassadorDashboard />} />
        </Routes>
      </main>
    </div>
  );
};

export default AmbassadorRoutes;