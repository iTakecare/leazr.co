
import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import LeazrSaaSSidebar from "./LeazrSaaSSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { user, isSuperAdmin, isLoading } = useAuth();

  // Vérifier si on est sur une page SaaS Leazr (sous /admin/leazr-saas-*)
  const isLeazrSaaSPage = location.pathname.startsWith('/admin/leazr-saas-');
  
  // Defensive check: only call isSuperAdmin if it exists and auth is not loading
  const isLeazrSaaSAdmin = !isLoading && isSuperAdmin && typeof isSuperAdmin === 'function' ? isSuperAdmin() : false;

  // Utiliser la sidebar SaaS si on est admin SaaS et sur une page SaaS
  const shouldUseLeazrSaaSSidebar = isLeazrSaaSAdmin && isLeazrSaaSPage;

  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      {shouldUseLeazrSaaSSidebar ? (
        <LeazrSaaSSidebar />
      ) : (
        <Sidebar />
      )}
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
