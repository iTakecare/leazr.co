
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/itakecare-pack";
import HomeHeader from "@/components/home/HomeHeader";

const ClientITakecarePage = () => {
  return (
    <>
      <HomeHeader />
      <PageTransition>
        <Container>
          <h1 className="text-2xl font-bold mb-6">Pack iTakecare</h1>
          <ITakecarePack />
        </Container>
      </PageTransition>
    </>
  );
};

export default ClientITakecarePage;
