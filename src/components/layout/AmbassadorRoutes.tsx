
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AmbassadorDashboardPage from "@/pages/AmbassadorPages/AmbassadorDashboardPage";
import AmbassadorCatalog from "@/pages/AmbassadorCatalog";
import AmbassadorCreateOffer from "@/pages/AmbassadorCreateOffer";
import AmbassadorClientsPage from "@/pages/AmbassadorPages/AmbassadorClientsPage";
import AmbassadorOffersPage from "@/pages/AmbassadorPages/AmbassadorOffersPage";
import AmbassadorClientCreatePage from "@/pages/AmbassadorPages/AmbassadorClientCreatePage";
// Utiliser l'écran admin pour les détails d'offre
import AdminOfferDetail from "@/pages/AdminOfferDetail";

const AmbassadorRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<AmbassadorDashboardPage />} />
      <Route path="catalog" element={<AmbassadorCatalog />} />
      <Route path="create-offer" element={<AmbassadorCreateOffer />} />
      <Route path="clients" element={<AmbassadorClientsPage />} />
      <Route path="clients/create" element={<AmbassadorClientCreatePage />} />
      <Route path="offers" element={<AmbassadorOffersPage />} />
      {/* Utiliser l'écran admin au lieu de l'écran ambassadeur spécialisé */}
      <Route path="offers/:id" element={<AdminOfferDetail />} />
      {/* Redirection par défaut vers le dashboard */}
      <Route path="" element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default AmbassadorRoutes;
