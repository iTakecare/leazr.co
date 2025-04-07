
import React from 'react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';

const ClientEquipmentPage = () => {
  return (
    <PageTransition>
      <Container>
        <h1 className="text-2xl font-bold mb-6">Mes équipements</h1>
        <p>Liste de vos équipements</p>
      </Container>
    </PageTransition>
  );
};

export default ClientEquipmentPage;
