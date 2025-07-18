
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import SimplifiedCloudflareManager from "@/components/admin/SimplifiedCloudflareManager";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";

const LeazrSaasDomains = () => {
  const { user } = useAuth();

  // Vérifier que seul l'admin SaaS peut accéder à cette page
  if (!user || user.email !== "ecommerce@itakecare.be") {
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
