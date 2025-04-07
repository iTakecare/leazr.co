
import React from 'react';
import { useParams } from 'react-router-dom';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <PageTransition>
      <Container>
        <h1 className="text-2xl font-bold mb-6">Détail du contrat</h1>
        <p>Détails du contrat ID: {id}</p>
      </Container>
    </PageTransition>
  );
};

export default ContractDetail;
