
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAmbassadorClients } from "@/hooks/useAmbassadorClients";
import AmbassadorClientsList from "@/components/ambassador/AmbassadorClientsList";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AmbassadorClientsPage = () => {
  const navigate = useNavigate();
  const { clients, isLoading, error, loadClients } = useAmbassadorClients();

  const handleCreateClient = () => {
    navigate("/ambassador/clients/create");
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Mes clients</h1>
              <p className="text-muted-foreground">
                Gérez vos clients et leurs informations
              </p>
            </div>
            <Button onClick={handleCreateClient}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau client
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Liste des clients</CardTitle>
            </CardHeader>
            <CardContent>
              <AmbassadorClientsList 
                clients={clients}
                isLoading={isLoading}
                error={error}
                onRefresh={loadClients}
              />
            </CardContent>
          </Card>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorClientsPage;
