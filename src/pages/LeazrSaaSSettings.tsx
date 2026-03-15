
import React from 'react';
import WaveLoader from "@/components/ui/WaveLoader";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import SaaSSettingsManager from "@/components/saas/SaaSSettingsManager";

const LeazrSaaSSettings = () => {
  const { user, isSuperAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  // Defensive check: only call isSuperAdmin if it exists and auth is not loading
  const isLeazrSaaSAdmin = !isLoading && isSuperAdmin && typeof isSuperAdmin === 'function' ? isSuperAdmin() : false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <WaveLoader />
      </div>
    );
  }

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
