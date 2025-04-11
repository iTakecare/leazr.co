
import React from 'react';
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import ProductDataTracker from '@/components/test/ProductDataTracker';

/**
 * Page de test pour vérifier la préservation des attributs et spécifications
 * des produits lors de la création d'une offre
 */
const TestAttributesPage: React.FC = () => {
  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <ProductDataTracker />
        </div>
      </Container>
    </PageTransition>
  );
};

export default TestAttributesPage;
