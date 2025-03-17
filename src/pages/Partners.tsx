
import React from 'react';
import { PartnersList } from '@/components/crm/PartnersList';

const Partners = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Partenaires</h1>
      <PartnersList />
    </div>
  );
};

export default Partners;
