import React, { useMemo } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
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
import ClientDocumentCenterPage from "@/pages/ClientDocumentCenterPage";
import ClientHelpPage from "@/pages/client/ClientHelpPage";
import AIChatWidget from "@/components/client/AIChatWidget";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { Plus } from "lucide-react";
import ClientSearch from "@/components/client/ClientSearch";
import ClientNotificationsBell from "@/components/client/ClientNotificationsBell";

/** Styles globaux de l'espace client (font Inter + scrollbar + keyframes maquette). */
const CLIENT_SHELL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
.lzr-shell, .lzr-shell input, .lzr-shell button, .lzr-shell select, .lzr-shell textarea { font-family: 'Inter', system-ui, sans-serif; }
.lzr-scroll::-webkit-scrollbar { width: 9px; height: 9px; }
.lzr-scroll::-webkit-scrollbar-thumb { background:#cdd3de; border-radius:9px; border:2px solid transparent; background-clip:padding-box; }
.lzr-scroll::-webkit-scrollbar-thumb:hover { background:#b4bccb; background-clip:padding-box; }
.lzr-scroll::-webkit-scrollbar-track { background: transparent; }
@keyframes lzrShine { 0%{transform:translateX(-120%)} 60%,100%{transform:translateX(260%)} }
`;

const ROUTE_TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p.includes("/dashboard"), title: "Tableau de bord" },
  { match: (p) => p.includes("/contracts"), title: "Mes contrats" },
  { match: (p) => p.includes("/documents"), title: "Mes documents" },
  { match: (p) => p.includes("/equipment"), title: "Gestion des équipements" },
  { match: (p) => p.includes("/products") || p.includes("/panier"), title: "Catalogue" },
  { match: (p) => p.includes("/requests"), title: "Mes demandes" },
  { match: (p) => p.includes("/support"), title: "Support" },
  { match: (p) => p.includes("/aide"), title: "Aide & Guide" },
  { match: (p) => p.includes("/settings"), title: "Paramètres" },
];

const ClientTopbar = () => {
  const { navigateToClient } = useRoleNavigation();
  const location = useLocation();
  const pageTitle = useMemo(() => {
    const hit = ROUTE_TITLES.find((r) => r.match(location.pathname));
    return hit?.title ?? "Espace client";
  }, [location.pathname]);

  return (
    <header
      style={{
        flex: "none",
        height: 64,
        background: "rgba(255,255,255,.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #E6E9EF",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 28px",
        zIndex: 20,
      }}
    >
      <div className="pl-12 lg:pl-0" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em", color: "#0F172A" }}>
          {pageTitle}
        </div>
      </div>

      <ClientSearch />

      <ClientNotificationsBell />

      <button
        onClick={() => navigateToClient("products")}
        className="hidden sm:flex"
        style={{
          alignItems: "center",
          gap: 8,
          height: 40,
          padding: "0 16px",
          border: 0,
          borderRadius: 11,
          background: "linear-gradient(135deg,#3D6BFF,#2D55E5)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(45,85,229,.32)",
          flex: "none",
        }}
      >
        <Plus size={16} />
        Nouvelle demande
      </button>
    </header>
  );
};

const ClientRoutes = () => {
  return (
    <div
      className="lzr-shell"
      style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", background: "#F3F4F7" }}
    >
      <style>{CLIENT_SHELL_STYLES}</style>
      <ClientSidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
        <ClientTopbar />
        <main className="lzr-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <Routes>
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="contracts" element={<ClientContractsPage />} />
            <Route path="contracts/:id" element={<ClientContractDetailPage />} />
            <Route path="documents" element={<ClientDocumentCenterPage />} />
            <Route path="requests" element={<ClientRequestsPage />} />
            <Route path="requests/:id" element={<ClientRequestDetailPage />} />
            <Route path="equipment" element={<ClientEquipmentPage />} />
            <Route path="products" element={<ClientCatalogPage />} />
            <Route path="products/:productId" element={<ClientProductDetailPage />} />
            <Route path="panier" element={<ClientCartPage />} />
            <Route path="panier/demande" element={<ClientCartRequestPage />} />
            <Route path="support" element={<ClientSupportPage />} />
            <Route path="aide" element={<ClientHelpPage />} />
            <Route path="settings" element={<ClientSettingsPage />} />
            <Route path="" element={<ClientDashboard />} />
            <Route path="*" element={<ClientDashboard />} />
          </Routes>
        </main>
      </div>
      <AIChatWidget />
    </div>
  );
};

export default ClientRoutes;
