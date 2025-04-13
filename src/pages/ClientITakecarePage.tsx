
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/itakecare-pack";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";

const ClientITakecarePage = () => {
  return (
    <>
      <UnifiedNavigation />
      <PageTransition>
        <div className="pt-[100px]">
          <Container>
            <h1 className="text-2xl font-bold mb-6">Pack iTakecare</h1>
            <ITakecarePack />
          </Container>
        </div>
      </PageTransition>
    </>
  );
};

export default ClientITakecarePage;
