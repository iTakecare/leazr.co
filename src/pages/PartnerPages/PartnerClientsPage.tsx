import React from "react";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import PartnerClientsList from "@/components/partners/PartnerClientsList";

const PartnerClientsPage = () => {
  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Mes Clients</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos clients et leurs informations
            </p>
          </div>
          
          <PartnerClientsList />
        </div>
      </Container>
    </PageTransition>
  );
};

export default PartnerClientsPage;