import React from "react";
import { useAuth } from "@/context/AuthContext";
import { CloudflareSubdomainManager } from "@/components/admin/CloudflareSubdomainManager";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CloudflareDomainPage = () => {
  const { user } = useAuth();

  // Vérifier que seul l'admin SaaS peut accéder à cette page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check SaaS admin role from database instead of hardcoded email
  const [isSaaSAdmin, setIsSaaSAdmin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkSaaSAdmin = async () => {
      const { data, error } = await supabase.rpc('is_saas_admin');
      if (!error) {
        setIsSaaSAdmin(data);
      } else {
        setIsSaaSAdmin(false);
      }
    };

    if (user) {
      checkSaaSAdmin();
    }
  }, [user]);

  if (isSaaSAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Vérification des autorisations...</span>
      </div>
    );
  }

  if (!isSaaSAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gestion des Domaines</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les sous-domaines Cloudflare pour les clients Leazr
          </p>
        </div>
        
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <CloudflareSubdomainManager />
        </div>
      </div>
    </div>
  );
};

export default CloudflareDomainPage;