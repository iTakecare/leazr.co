
import React from "react";
import { Loader2 } from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";

const OffersLoading = () => {
  return (
    <PageTransition>
      <Container>
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default OffersLoading;
