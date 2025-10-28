import React from 'react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

const BrokerCreateOffer: React.FC = () => {
  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculateur Broker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Calculateur en développement. La saisie manuelle d'équipements sera disponible prochainement.
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </PageTransition>
  );
};

export default BrokerCreateOffer;
