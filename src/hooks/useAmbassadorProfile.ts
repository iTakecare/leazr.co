
import { useState, useEffect } from 'react';
import { getCurrentAmbassadorProfile, getAmbassadorProfileDetails } from '@/services/ambassador/ambassadorProfile';
import { toast } from 'sonner';

export const useAmbassadorProfile = () => {
  const [ambassadorId, setAmbassadorId] = useState<string | null>(null);
  const [ambassadorData, setAmbassadorData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAmbassadorProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Obtenir l'ID de l'ambassadeur
        const id = await getCurrentAmbassadorProfile();
        setAmbassadorId(id);
        
        if (id) {
          // Obtenir les détails complets
          const details = await getAmbassadorProfileDetails();
          setAmbassadorData(details);
        }
      } catch (err) {
        console.error("Error loading ambassador profile:", err);
        setError(err instanceof Error ? err.message : "Erreur lors du chargement du profil ambassadeur");
        toast.error("Erreur lors du chargement du profil ambassadeur");
      } finally {
        setIsLoading(false);
      }
    };

    loadAmbassadorProfile();
  }, []);

  return {
    ambassadorId,
    ambassadorData,
    isLoading,
    error,
    isAmbassador: ambassadorId !== null
  };
};
