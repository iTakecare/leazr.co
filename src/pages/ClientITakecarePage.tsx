
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/itakecare-pack";

const ClientPackSelectionPage = () => {
  return (
    <PageTransition>
      <Container>
        <ITakecarePack />
      </Container>
    </PageTransition>
  );
};

export default ClientPackSelectionPage;
