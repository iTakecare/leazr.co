
import React from 'react';
import { useParams } from 'react-router-dom';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';

const OfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <PageTransition>
      <Container>
        <h1 className="text-2xl font-bold mb-6">Détail de l'offre</h1>
        <p>Détails de l'offre ID: {id}</p>
      </Container>
    </PageTransition>
  );
};

export default OfferDetail;
