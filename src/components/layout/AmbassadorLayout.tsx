
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AmbassadorSidebar from "./AmbassadorSidebar";
import Navbar from "./Navbar";
import { toast } from "sonner";

export const AmbassadorLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, isLoading, isAmbassador } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    if (!isLoading && user) {
      console.log("[AmbassadorLayout] Vérification de l'accès:", {
        user: !!user,
        role: user.role,
        isAmbassador: isAmbassador(),
        email: user?.email,
        ambassador_id: user?.ambassador_id
      });
      
      // Pour le moment, permettre l'accès à tous les utilisateurs connectés
      // TODO: Améliorer la logique de vérification des rôles ambassadeur
      if (!user) {
        console.log("[AmbassadorLayout] Utilisateur non connecté, redirection vers login");
        navigate("/login", { replace: true });
        return;
      }
    } else if (!isLoading && !user) {
      // Si non authentifié, rediriger vers la page de connexion
      console.log("[AmbassadorLayout] Utilisateur non authentifié, redirection vers login");
      navigate("/login", { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
      </div>
    );
  }

  // Ne rendre le contenu que si l'utilisateur est connecté
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AmbassadorSidebar />
      <div className="flex flex-1 flex-col overflow-hidden ml-64">
        <main className="flex-1 overflow-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AmbassadorLayout;
