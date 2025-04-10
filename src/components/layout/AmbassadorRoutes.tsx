
import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AmbassadorLayout from "@/components/layout/AmbassadorLayout";
import { toast } from "sonner";
import NotFound from "@/pages/NotFound";

// Import Ambassador pages
import AmbassadorDashboardPage from "@/pages/AmbassadorPages/AmbassadorDashboardPage";
import AmbassadorClientsPage from "@/pages/AmbassadorPages/AmbassadorClientsPage";
import AmbassadorClientCreatePage from "@/pages/AmbassadorPages/AmbassadorClientCreatePage";
import AmbassadorCreateOffer from "@/pages/AmbassadorPages/AmbassadorCreateOffer";
import AmbassadorOffersPage from "@/pages/AmbassadorPages/AmbassadorOffersPage";
import AmbassadorOfferDetail from "@/pages/AmbassadorPages/AmbassadorOfferDetail";
import AmbassadorProductDetail from "@/pages/AmbassadorPages/AmbassadorProductDetail";
import AmbassadorCatalog from "@/pages/AmbassadorCatalog";

const AmbassadorRoutes = () => {
  const { user, isLoading, isAmbassador, userRoleChecked } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && userRoleChecked && user) {
      console.log("[AmbassadorRoutes] Vérification de l'accès:", {
        isAmbassador: isAmbassador(),
        email: user?.email,
        role: user?.role
      });

      if (!isAmbassador()) {
        console.log("[AmbassadorRoutes] Non-ambassadeur tentant d'accéder à l'espace ambassadeur");
        toast.error("Vous n'avez pas les droits d'accès à l'espace ambassadeur");
        
        // Redirect based on user role
        if (user.role === "client") {
          navigate("/client/dashboard", { replace: true });
        } else if (user.role === "partner") {
          navigate("/partner/dashboard", { replace: true });
        } else if (user.role === "admin") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    } else if (!isLoading && userRoleChecked && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, isLoading, isAmbassador, userRoleChecked, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAmbassador()) {
    return null; // Will redirect in useEffect
  }

  return (
    <Routes>
      <Route element={<AmbassadorLayout />}>
        <Route index element={<Navigate to="/ambassador/dashboard" replace />} />
        <Route path="dashboard" element={<AmbassadorDashboardPage />} />
        <Route path="clients" element={<AmbassadorClientsPage />} />
        <Route path="clients/create" element={<AmbassadorClientCreatePage />} />
        <Route path="create-offer" element={<AmbassadorCreateOffer />} />
        <Route path="offers" element={<AmbassadorOffersPage />} />
        <Route path="offers/:id" element={<AmbassadorOfferDetail />} />
        <Route path="catalog" element={<AmbassadorCatalog />} />
        <Route path="catalog/product/:id" element={<AmbassadorProductDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AmbassadorRoutes;
