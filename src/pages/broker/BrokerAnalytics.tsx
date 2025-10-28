import React from 'react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const BrokerAnalytics: React.FC = () => {
  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics Broker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Page d'analytics en développement. Les métriques seront disponibles prochainement.
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </PageTransition>
  );
};

export default BrokerAnalytics;
