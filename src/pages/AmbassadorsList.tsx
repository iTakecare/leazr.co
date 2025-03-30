
import React from 'react';
import { Card } from "@/components/ui/card";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import AmbassadorsList from "@/components/crm/AmbassadorsList";

const AmbassadorsListPage = () => {
  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <h1 className="text-2xl font-bold mb-6">Ambassadeurs</h1>
          <Card className="p-4">
            <AmbassadorsList />
          </Card>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorsListPage;
