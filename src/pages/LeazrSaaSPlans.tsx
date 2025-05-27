
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const LeazrSaaSPlans = () => {
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-1">Plans & Tarifs</h1>
            <p className="text-muted-foreground">
              Gestion des plans d'abonnement et tarification de la plateforme SaaS Leazr
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Plans d'Abonnement</CardTitle>
              <CardDescription>
                Configuration des plans et tarifs de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cette fonctionnalité sera développée prochainement pour gérer les plans et tarifs.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaaSPlans;
