
import React from 'react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';
import PermissionsTest from '@/components/debug/PermissionsTest';

const DevTools = () => {
  return (
    <PageTransition>
      <Container>
        <div className="max-w-5xl mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8">Outils de développement</h1>
          
          <div className="grid gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Tests de permissions</h2>
              <PermissionsTest />
            </div>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default DevTools;
