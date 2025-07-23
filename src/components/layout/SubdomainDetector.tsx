
import { useEffect } from 'react';
import { useSubdomainDetection } from '@/hooks/useSubdomainDetection';
import { toast } from 'sonner';
import { BrandedPageTitle } from './BrandedPageTitle';
import { DeploymentStatus } from '../deployment/DeploymentStatus';

/**
 * Composant qui détecte automatiquement l'entreprise basée sur le sous-domaine
 * et applique le thème correspondant
 */
export const SubdomainDetector = ({ children }: { children: React.ReactNode }) => {
  const { detection, loading, error, isSubdomainDetected, isCompanyDetected } = useSubdomainDetection();

  useEffect(() => {
    if (error) {
      console.error('Erreur de détection de sous-domaine:', error);
      // Ne pas afficher de toast pour éviter de spammer l'utilisateur
    }
  }, [error]);

  useEffect(() => {
    if (isCompanyDetected && detection.company) {
      console.log('✅ Entreprise détectée:', {
        name: detection.company.name,
        method: detection.detectionMethod
      });
      
      // Optionnel: afficher une notification discrète seulement pour les sous-domaines
      if (isSubdomainDetected && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        toast.success(`Application configurée pour ${detection.company.name}`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
    }
  }, [isCompanyDetected, isSubdomainDetected, detection.company]);

  // Pendant le chargement de la détection, afficher les enfants normalement
  if (loading) {
    return (
      <>
        {children}
        <DeploymentStatus />
      </>
    );
  }

  // Ajouter des propriétés CSS personnalisées pour l'entreprise détectée
  if (isCompanyDetected && detection.company) {
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
        <DeploymentStatus />
      </div>
    );
  }

  return (
    <>
      <BrandedPageTitle />
      {children}
      <DeploymentStatus />
    </>
  );
};
