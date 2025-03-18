
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/ITakecarePack";

const ITakecarePage = () => {
  return (
    <PageTransition>
      <Container>
        <ITakecarePack />
      </Container>
    </PageTransition>
  );
};

export default ITakecarePage;
