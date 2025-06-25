
import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import LeazrSaaSSidebar from "./LeazrSaaSSidebar";
import ErrorBoundary from "@/components/ErrorBoundary";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { user } = useAuth();

  // Vérifier si on est sur une page SaaS Leazr (sous /admin/leazr-saas-*)
  const isLeazrSaaSPage = location.pathname.startsWith('/admin/leazr-saas-');
  const isLeazrSaaSAdmin = user?.email === "ecommerce@itakecare.be";

  // Utiliser la sidebar SaaS si on est admin SaaS et sur une page SaaS
  const shouldUseLeazrSaaSSidebar = isLeazrSaaSAdmin && isLeazrSaaSPage;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex w-full">
        {shouldUseLeazrSaaSSidebar ? (
          <LeazrSaaSSidebar />
        ) : (
          <Sidebar />
        )}
        
        <main className="flex-1 overflow-auto">
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default Layout;
