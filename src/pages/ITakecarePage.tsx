
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/itakecare-pack";

const ITakecarePage = () => {
  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <ITakecarePack />
        </div>
      </Container>
    </PageTransition>
  );
};

export default ITakecarePage;
