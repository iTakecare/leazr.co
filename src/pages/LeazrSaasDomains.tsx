
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import SimplifiedCloudflareManager from "@/components/admin/SimplifiedCloudflareManager";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const LeazrSaasDomains = () => {
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
    <PageTransition>
      <Container>
        <motion.div
          className="py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gestion des Domaines SaaS</h1>
            <p className="text-muted-foreground mt-2">
              Interface simplifiée pour la gestion automatisée des sous-domaines Cloudflare
            </p>
          </div>
          
          <SimplifiedCloudflareManager />
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaasDomains;
