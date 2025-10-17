import React from 'react';
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import DuplicateClientsList from "@/components/admin/DuplicateClientsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const ClientDuplicates = () => {
  return (
    <PageTransition>
      <Container>
        <motion.div
          className="py-4 space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Gestion des doublons</h1>
            <p className="text-muted-foreground">
              Détectez et fusionnez automatiquement les clients en doublon dans votre CRM.
            </p>
          </div>

          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <CardTitle className="text-warning">Attention</CardTitle>
                  <CardDescription>
                    La fusion de clients est une opération irréversible. Assurez-vous de vérifier 
                    les informations avant de confirmer la fusion.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <DuplicateClientsList />
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default ClientDuplicates;
