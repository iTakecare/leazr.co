import React from 'react';
import { Loader2 } from 'lucide-react';
import { useBrokerData } from '@/hooks/useBrokerData';
import BrokerCreateOffer from '@/pages/broker/BrokerCreateOffer';
import CreateOffer from '@/pages/CreateOffer';

const AdminCreateOfferSwitch: React.FC = () => {
  const { broker, loading } = useBrokerData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Chargement…</span>
      </div>
    );
  }

  return broker ? <BrokerCreateOffer /> : <CreateOffer />;
};

export default AdminCreateOfferSwitch;
