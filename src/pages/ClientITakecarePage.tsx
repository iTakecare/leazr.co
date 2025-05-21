
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import LeazrPack from "@/components/packs/leazr-pack";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";

const ClientLeazrPage = () => {
  return (
    <>
      <UnifiedNavigation />
      <PageTransition>
        <div className="pt-[100px]">
          <Container>
            <h1 className="text-2xl font-bold mb-6">Pack Leazr</h1>
            <LeazrPack />
          </Container>
        </div>
      </PageTransition>
    </>
  );
};

export default ClientLeazrPage;
