
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import LeazrPack from "@/components/packs/leazr-pack";

const LeazrPage = () => {
  return (
    <PageTransition>
      <div className="pt-6">
        <Container>
          <LeazrPack />
        </Container>
      </div>
    </PageTransition>
  );
};

export default LeazrPage;
