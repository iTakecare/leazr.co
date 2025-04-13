
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/itakecare-pack";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";

const ITakecarePage = () => {
  return (
    <>
      <UnifiedNavigation />
      <PageTransition>
        <div className="pt-[100px]">
          <Container>
            <ITakecarePack />
          </Container>
        </div>
      </PageTransition>
    </>
  );
};

export default ITakecarePage;
