
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/itakecare-pack";
import HomeHeader from "@/components/home/HomeHeader";

const ITakecarePage = () => {
  return (
    <>
      <HomeHeader />
      <PageTransition>
        <Container>
          <ITakecarePack />
        </Container>
      </PageTransition>
    </>
  );
};

export default ITakecarePage;
