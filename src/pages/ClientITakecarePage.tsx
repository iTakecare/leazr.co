
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/itakecare-pack";

const ClientITakecarePage = () => {
  return (
    <PageTransition>
      <Container>
        <h1 className="text-2xl font-bold mb-6">Pack iTakecare</h1>
        <ITakecarePack />
      </Container>
    </PageTransition>
  );
};

export default ClientITakecarePage;
