import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./Sidebar";
import LeazrSaaSSidebar from "./LeazrSaaSSidebar";
import MobileLayout from "@/components/mobile/MobileLayout";
import SubscriptionBanner from "@/components/subscription/SubscriptionBanner";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { isSuperAdmin, isLoading } = useAuth();
  const isMobile = useIsMobile();

  // Vérifier si on est sur une page SaaS Leazr (sous /admin/leazr-saas-*)
  const isLeazrSaaSPage = location.pathname.startsWith('/admin/leazr-saas-');
  
  // Defensive check: only call isSuperAdmin if it exists and auth is not loading
  const isLeazrSaaSAdmin = !isLoading && isSuperAdmin && typeof isSuperAdmin === 'function' ? isSuperAdmin() : false;

  // Utiliser la sidebar SaaS si on est admin SaaS et sur une page SaaS
  const shouldUseLeazrSaaSSidebar = isLeazrSaaSAdmin && isLeazrSaaSPage;

  // Mode embarqué (?embed=1) : page nue, sans sidebar ni bandeau — utilisé
  // pour afficher une demande/fiche dans une iframe (ex. Centre d'appels).
  const isEmbedded = new URLSearchParams(location.search).get("embed") === "1";
  if (isEmbedded) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Rendu mobile
  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  // Rendu desktop
  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      {shouldUseLeazrSaaSSidebar ? (
        <LeazrSaaSSidebar />
      ) : (
        <Sidebar />
      )}
      
      <main className="flex-1 overflow-y-auto">
        {/* Bandeau de fin d'essai (blocage doux) — masqué pour l'admin SaaS plateforme */}
        {!shouldUseLeazrSaaSSidebar && <SubscriptionBanner />}
        {children}
      </main>
    </div>
  );
};

export default Layout;
