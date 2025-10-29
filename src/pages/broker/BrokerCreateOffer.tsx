import React from 'react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';
import BrokerCalculator from '@/components/broker/calculator/BrokerCalculator';

const BrokerCreateOffer: React.FC = () => {
  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <BrokerCalculator />
        </div>
      </Container>
    </PageTransition>
  );
};

export default BrokerCreateOffer;
