
import React from 'react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';

const ClientSupportPage = () => {
  return (
    <PageTransition>
      <Container>
        <h1 className="text-2xl font-bold mb-6">Support</h1>
        <p>Contactez notre service client pour toute assistance.</p>
      </Container>
    </PageTransition>
  );
};

export default ClientSupportPage;
