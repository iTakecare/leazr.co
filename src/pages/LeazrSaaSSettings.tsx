
import React from 'react';
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import SaaSSettingsManager from "@/components/saas/SaaSSettingsManager";

const LeazrSaaSSettings = () => {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Vérifier si l'utilisateur est super admin
  const isLeazrSaaSAdmin = isSuperAdmin();

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
          <SaaSSettingsManager />
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaaSSettings;
