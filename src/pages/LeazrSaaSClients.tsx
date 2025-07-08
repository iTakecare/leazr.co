
import React from 'react';
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSaaSData } from "@/hooks/useSaaSData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Calendar, CreditCard, Users } from "lucide-react";

const LeazrSaaSClients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { companies, loading } = useSaaSData();

  // Vérifier si l'utilisateur est autorisé
  const isLeazrSaaSAdmin = user?.email === "ecommerce@itakecare.be";

  if (!isLeazrSaaSAdmin) {
    navigate("/dashboard");
    return null;
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      trial: "bg-blue-100 text-blue-800",
      expired: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800"
    };
    return variants[status as keyof typeof variants] || variants.trial;
  };

  const getPlanBadge = (plan: string) => {
    const variants = {
      starter: "bg-gray-100 text-gray-800",
      pro: "bg-purple-100 text-purple-800",
      business: "bg-orange-100 text-orange-800"
    };
    return variants[plan as keyof typeof variants] || variants.starter;
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="py-4">
            <div className="flex justify-center items-center min-h-64">
              <div className="text-lg">Chargement des clients...</div>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <motion.div
          className="py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Clients Leazr SaaS</h1>
              <p className="text-muted-foreground">
                Gestion des entreprises clientes ({companies.length} clients)
              </p>
            </div>

            <div className="grid gap-4">
              {companies.map((company) => (
                <Card key={company.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {company.name}
                        </CardTitle>
                        <CardDescription>
                          Admin: {company.profile?.first_name} {company.profile?.last_name}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusBadge(company.account_status)}>
                          {company.account_status}
                        </Badge>
                        <Badge className={getPlanBadge(company.plan)}>
                          {company.plan}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Créé le {new Date(company.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      {company.trial_ends_at && (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>Essai jusqu'au {new Date(company.trial_ends_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      {company.modules_enabled && company.modules_enabled.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{company.modules_enabled.length} modules actifs</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaaSClients;
