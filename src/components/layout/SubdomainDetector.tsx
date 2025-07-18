import { useEffect } from 'react';
import { useSubdomainDetection } from '@/hooks/useSubdomainDetection';
import { toast } from 'sonner';
import { BrandedPageTitle } from './BrandedPageTitle';

/**
 * Composant qui détecte automatiquement l'entreprise basée sur le sous-domaine
 * et applique le thème correspondant
 */
export const SubdomainDetector = ({ children }: { children: React.ReactNode }) => {
  const { detection, loading, error, isSubdomainDetected } = useSubdomainDetection();

  useEffect(() => {
    if (error) {
      console.error('Erreur de détection de sous-domaine:', error);
      // Ne pas afficher de toast pour éviter de spammer l'utilisateur
    }
  }, [error]);

  useEffect(() => {
    if (isSubdomainDetected && detection.company) {
      console.log('✅ Entreprise détectée via sous-domaine:', detection.company.name);
      
      // Optionnel: afficher une notification discrète
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        toast.success(`Application configurée pour ${detection.company.name}`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
    }
  }, [isSubdomainDetected, detection.company]);

  // Pendant le chargement de la détection, afficher les enfants normalement
  if (loading) {
    return <>{children}</>;
  }

  // Ajouter des propriétés CSS personnalisées pour l'entreprise détectée
  if (isSubdomainDetected && detection.company) {
    return (
      <div
        className="min-h-screen"
        style={{
          '--detected-company-id': detection.companyId,
          '--detected-company-name': `"${detection.company.name}"`,
        } as React.CSSProperties}
      >
        <BrandedPageTitle />
        {children}
      </div>
    );
  }

  return (
    <>
      <BrandedPageTitle />
      {children}
    </>
  );
};