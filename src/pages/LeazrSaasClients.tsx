
import React from 'react';
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UnifiedClientSetup from "@/components/admin/UnifiedClientSetup";
import { PostalCodeImport } from "@/components/admin/PostalCodeImport";

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
            <h1 className="text-3xl font-bold text-foreground">Administration Système</h1>
            <p className="text-muted-foreground mt-2">
              Configuration et gestion des données système
            </p>
          </div>
          
          <Tabs defaultValue="clients" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="clients">Applications Clients</TabsTrigger>
              <TabsTrigger value="postal-codes">Codes Postaux</TabsTrigger>
            </TabsList>
            <TabsContent value="clients" className="mt-6">
              <UnifiedClientSetup />
            </TabsContent>
            <TabsContent value="postal-codes" className="mt-6">
              <PostalCodeImport />
            </TabsContent>
          </Tabs>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaasClients;
