import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useBrokerData } from '@/hooks/useBrokerData';
import BrokerCreateOffer from '@/pages/broker/BrokerCreateOffer';
import CreateOffer from '@/pages/CreateOffer';

const AdminCreateOfferSwitch: React.FC = () => {
  const { broker, loading } = useBrokerData();
  
  // Capture l'état initial du broker une seule fois pour éviter les re-renders
  const [initialBrokerState, setInitialBrokerState] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Ne définir l'état initial qu'une seule fois, quand le chargement initial est terminé
    if (!loading && initialBrokerState === null) {
      setInitialBrokerState(!!broker);
      setIsInitialized(true);
    }
  }, [broker, loading, initialBrokerState]);

  // Afficher le loader uniquement pendant le chargement INITIAL
  if (!isInitialized && loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Chargement…</span>
      </div>
    );
  }

  // Utiliser l'état initial pour déterminer quel composant afficher
  // Cela évite de démonter le composant lors des rafraîchissements de token
  const isBroker = initialBrokerState ?? !!broker;
  
  return isBroker ? <BrokerCreateOffer /> : <CreateOffer />;
};

export default AdminCreateOfferSwitch;
