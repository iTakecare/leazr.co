
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
      
      // Simple vérification : si l'utilisateur n'est pas un ambassadeur, rediriger
      if (!isAmbassador()) {
        console.log("[AmbassadorLayout] Non-ambassadeur tentant d'accéder à l'espace ambassadeur");
        toast.error("Vous n'avez pas les droits d'accès à l'espace ambassadeur");
        
        // Rediriger vers la page appropriée en fonction du rôle
        if (user.role === "client") {
          navigate("/client/dashboard", { replace: true });
        } else if (user.role === "partner") {
          navigate("/partner/dashboard", { replace: true });
        } else if (user.role === "admin") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
        return;
      }
      
      // Permettre l'accès même si l'ID ambassadeur est manquant
      // Simplement enregistrer un avertissement mais ne pas bloquer l'accès
      if (!user.ambassador_id) {
        console.log("[AmbassadorLayout] ID d'ambassadeur manquant mais permettant l'accès");
      }
    } else if (!isLoading && !user) {
      // Si non authentifié, rediriger vers la page de connexion
      console.log("[AmbassadorLayout] Utilisateur non authentifié, redirection vers login");
      navigate("/login", { replace: true });
    }
  }, [user, isLoading, navigate, isAmbassador]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
      </div>
    );
  }

  // Ne rendre le contenu que si l'utilisateur est un ambassadeur
  if (!user || !isAmbassador()) {
    return null;
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
