
import React from 'react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';

const ClientRequestsPage = () => {
  return (
    <PageTransition>
      <Container>
        <h1 className="text-2xl font-bold mb-6">Mes demandes</h1>
        <p>Liste de vos demandes en cours</p>
      </Container>
    </PageTransition>
  );
};

export default ClientRequestsPage;
