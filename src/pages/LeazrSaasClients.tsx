
import React from 'react';
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import UnifiedClientSetup from "@/components/admin/UnifiedClientSetup";

const LeazrSaasClients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Vérifier si l'utilisateur est autorisé
  const isLeazrSaaSAdmin = user?.email === "ecommerce@itakecare.be";

  if (!isLeazrSaaSAdmin) {
    navigate("/dashboard");
    return null;
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
            <h1 className="text-3xl font-bold text-foreground">Gestion des Applications</h1>
            <p className="text-muted-foreground mt-2">
              Configuration et déploiement des applications clients
            </p>
          </div>
          
          <UnifiedClientSetup />
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaasClients;
