
import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AmbassadorSidebar from "./AmbassadorSidebar";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

export const AmbassadorLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, isLoading, userRoleChecked, isAmbassador } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isLoading && userRoleChecked && user) {
      console.log("[AmbassadorLayout] Vérification de l'accès:", {
        user: !!user,
        role: user.role,
        isAmbassador: isAmbassador(),
        email: user?.email
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
    } else if (!isLoading && userRoleChecked && !user) {
      // Si non authentifié, rediriger vers la page de connexion
      console.log("[AmbassadorLayout] Utilisateur non authentifié, redirection vers login");
      navigate("/login", { replace: true });
    }
  }, [user, isLoading, userRoleChecked, navigate, isAmbassador]);

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
    <div className="min-h-screen flex bg-gradient-to-br from-background to-primary/5">
      {!isMobile && <AmbassadorSidebar />}
      
      <main className="flex-1 relative">
        <div className="absolute inset-0 pointer-events-none bg-[url('/grid-pattern.svg')] bg-center opacity-[0.02]" />
        <ScrollArea className="h-screen">
          <div className="p-4 md:p-6 pb-24">
            {children || <Outlet />}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
};

export default AmbassadorLayout;
