
import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/layout/Layout";
import PartnerDashboard from "@/pages/PartnerDashboard";
import PartnerCreateOffer from "@/pages/PartnerCreateOffer";
import PartnerOfferDetail from "@/pages/PartnerOfferDetail";
import NotFound from "@/pages/NotFound";
import { toast } from "sonner";

const PartnerRoutes = () => {
  const { user, isLoading, isPartner, userRoleChecked } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && userRoleChecked && user) {
      console.log("[PartnerRoutes] Vérification de l'accès:", {
        isPartner: isPartner(),
        email: user?.email,
        role: user?.role
      });

      if (!isPartner()) {
        console.log("[PartnerRoutes] Non-partenaire tentant d'accéder à l'espace partenaire");
        toast.error("Vous n'avez pas les droits d'accès à l'espace partenaire");
        
        // Redirect based on user role
        if (user.role === "client") {
          navigate("/client/dashboard", { replace: true });
        } else if (user.role === "ambassador") {
          navigate("/ambassador/dashboard", { replace: true });
        } else if (user.role === "admin") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    } else if (!isLoading && userRoleChecked && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, isLoading, isPartner, userRoleChecked, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isPartner()) {
    return null; // Will redirect in useEffect
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/partner/dashboard" replace />} />
        <Route path="dashboard" element={<PartnerDashboard />} />
        <Route path="create-offer" element={<PartnerCreateOffer />} />
        <Route path="offers/:id" element={<PartnerOfferDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default PartnerRoutes;
