
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
  const { user } = useAuth();

  // Vérifier si on est sur une page SaaS Leazr
  const isLeazrSaaSPage = location.pathname.startsWith('/leazr-saas-');
  const isLeazrSaaSAdmin = user?.email === "ecommerce@itakecare.be";

  // Utiliser la sidebar SaaS si on est admin SaaS et sur une page SaaS
  const shouldUseLeazrSaaSSidebar = isLeazrSaaSAdmin && isLeazrSaaSPage;

  return (
    <div className="min-h-screen bg-background flex w-full">
      {shouldUseLeazrSaaSSidebar ? (
        <LeazrSaaSSidebar />
      ) : (
        <Sidebar />
      )}
      
      <main className="flex-1 overflow-auto">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
