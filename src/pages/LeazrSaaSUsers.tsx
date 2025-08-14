import React from 'react';
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import SaaSCompaniesManager from "@/components/saas/SaaSCompaniesManager";

const LeazrSaaSUsers = () => {
  const { user, isSuperAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  const isLeazrSaaSAdmin = !isLoading && isSuperAdmin && typeof isSuperAdmin === 'function' ? isSuperAdmin() : false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Chargement...</span>
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
          <SaaSCompaniesManager />
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaaSUsers;