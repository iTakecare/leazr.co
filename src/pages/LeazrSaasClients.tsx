
import React from 'react';
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import UnifiedClientSetup from "@/components/admin/UnifiedClientSetup";
import { supabase } from "@/integrations/supabase/client";

const LeazrSaasClients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check SaaS admin role from database instead of hardcoded email
  const [isSaaSAdmin, setIsSaaSAdmin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkSaaSAdmin = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.rpc('is_saas_admin');
      if (!error) {
        setIsSaaSAdmin(data);
        if (!data) {
          navigate("/dashboard");
        }
      } else {
        setIsSaaSAdmin(false);
        navigate("/dashboard");
      }
    };

    checkSaaSAdmin();
  }, [user, navigate]);

  if (isSaaSAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Vérification des autorisations...</span>
      </div>
    );
  }

  if (!isSaaSAdmin) {
    return null; // Will redirect via useEffect
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
            <h1 className="text-3xl font-bold text-foreground">Administration Système</h1>
            <p className="text-muted-foreground mt-2">
              Configuration et gestion des applications clients
            </p>
          </div>
          
          <UnifiedClientSetup />
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaasClients;
