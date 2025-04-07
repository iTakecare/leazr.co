
import React from 'react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';

const ClientSettingsPage = () => {
  return (
    <PageTransition>
      <Container>
        <h1 className="text-2xl font-bold mb-6">Paramètres</h1>
        <p>Paramètres de votre compte client</p>
      </Container>
    </PageTransition>
  );
};

export default ClientSettingsPage;
