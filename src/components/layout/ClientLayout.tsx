
import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClientSidebar from "./ClientSidebar";
import Navbar from "./Navbar";
import { toast } from "sonner";

export const ClientLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, isLoading, userRoleChecked, isClient } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    if (!isLoading && userRoleChecked && user) {
      console.log("[ClientLayout] Vérification de l'accès:", {
        user: !!user,
        role: user.role,
        isClient: isClient(),
        email: user?.email
      });
      
      // Simple vérification : si l'utilisateur n'est pas un client, rediriger
      if (!isClient()) {
        console.log("[ClientLayout] Non-client tentant d'accéder à l'espace client");
        toast.error("Vous n'avez pas les droits d'accès à l'espace client");
        
        // Rediriger vers la page appropriée en fonction du rôle
        if (user.role === "ambassador") {
          navigate("/ambassador/dashboard", { replace: true });
        } else if (user.role === "partner") {
          navigate("/partner/dashboard", { replace: true });
        } else if (user.role === "admin") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
        return;
      }
    } else if (!isLoading && userRoleChecked && !user) {
      // Si non authentifié, rediriger vers la page de connexion
      console.log("[ClientLayout] Utilisateur non authentifié, redirection vers login");
      navigate("/login", { replace: true });
    }
  }, [user, isLoading, userRoleChecked, navigate, isClient]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
      </div>
    );
  }

  // Ne rendre le contenu que si l'utilisateur est un client
  if (!user || !isClient()) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ClientSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={handleMenuClick} />
        <main className="flex-1 overflow-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;
