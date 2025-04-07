
import React from 'react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';

const ClientDashboard = () => {
  return (
    <PageTransition>
      <Container>
        <h1 className="text-2xl font-bold mb-6">Tableau de bord client</h1>
        <p>Bienvenue sur votre espace client</p>
      </Container>
    </PageTransition>
  );
};

export default ClientDashboard;
