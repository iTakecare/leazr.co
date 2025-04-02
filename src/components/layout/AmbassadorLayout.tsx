
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AmbassadorSidebar from "./AmbassadorSidebar";
import Navbar from "./Navbar";
import { toast } from "sonner";

export const AmbassadorLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, isLoading, userRoleChecked, isAmbassador } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    if (!isLoading && userRoleChecked) {
      console.log("[AmbassadorLayout] Vérification de l'accès:", {
        user: !!user,
        isAmbassador: isAmbassador(),
        ambassador_id: user?.ambassador_id,
        email: user?.email
      });
      
      // Vérification de l'authentification en premier
      if (!user) {
        console.log("[AmbassadorLayout] Utilisateur non authentifié, redirection vers login");
        navigate("/login");
        return;
      }
      
      // Ensuite vérification stricte du rôle d'ambassadeur
      if (!isAmbassador()) {
        console.log("[AmbassadorLayout] Non-ambassadeur tentant d'accéder à l'espace ambassadeur, redirection");
        console.log("[AmbassadorLayout] Rôles de l'utilisateur:", {
          isAmbassador: isAmbassador(),
          ambassador_id: user?.ambassador_id,
          email: user?.email
        });
        toast.error("Vous n'avez pas les droits d'accès à l'espace ambassadeur");
        navigate("/", { replace: true });
        return;
      }
    }
  }, [user, isLoading, userRoleChecked, navigate, isAmbassador]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
      </div>
    );
  }

  // Vérification stricte pour s'assurer que l'utilisateur est un ambassadeur
  if (!user || !isAmbassador()) {
    console.log("[AmbassadorLayout] Conditions d'accès non remplies, aucun rendu");
    return null; // Pas de rendu pendant la redirection
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AmbassadorSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={handleMenuClick} />
        <main className="flex-1 overflow-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AmbassadorLayout;
