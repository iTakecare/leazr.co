
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/itakecare-pack";

const ITakecarePage = () => {
  return (
    <PageTransition>
      <div className="pt-6">
        <Container>
          <ITakecarePack />
        </Container>
      </div>
    </PageTransition>
  );
};

export default ITakecarePage;
