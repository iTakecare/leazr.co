
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import WaveLoader from "@/components/ui/WaveLoader";

const OffersLoading = () => {
  return (
    <PageTransition>
      <Container>
        <div className="flex h-[40vh] items-center justify-center">
          <WaveLoader message="Chargement des demandes..." />
        </div>
      </Container>
    </PageTransition>
  );
};

export default OffersLoading;
