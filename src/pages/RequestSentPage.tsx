
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Container from '@/components/layout/Container';

interface RequestSentState {
  success: boolean;
  companyName?: string;
  name?: string;
}

const RequestSentPage: React.FC = () => {
  const location = useLocation();
  const [requestData, setRequestData] = useState<any>(null);
  const state = location.state as RequestSentState;

  useEffect(() => {
    // Récupérer les détails de la demande depuis sessionStorage
    const lastRequest = sessionStorage.getItem('lastSubmittedRequest');
    if (lastRequest) {
      try {
        setRequestData(JSON.parse(lastRequest));
      } catch (e) {
        console.error("Error parsing request data:", e);
      }
    }
  }, []);

  if (!state?.success) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-2xl font-bold mb-4">Une erreur est survenue</h1>
          <p className="text-gray-600 mb-6">
            Nous n'avons pas pu traiter votre demande. Veuillez réessayer ou nous contacter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" asChild>
              <Link to="/contact">Nous contacter</Link>
            </Button>
            <Button asChild>
              <Link to="/catalog">Retour au catalogue</Link>
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-2xl mx-auto text-center">
        <div className="mb-6 bg-green-100 p-4 rounded-full">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Demande envoyée avec succès!</h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Merci {state.name} pour votre demande. Notre équipe commerciale vous contactera prochainement.
        </p>
        
        {requestData && (
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm w-full mb-8 text-left">
            <h2 className="font-semibold mb-4 text-center">Résumé de votre demande</h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Entreprise</p>
                <p className="font-medium">{state.companyName}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Équipement demandé</p>
                <p className="font-medium whitespace-pre-line">{requestData.equipment_description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Mensualité estimée</p>
                  <p className="font-medium">{new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(requestData.monthly_payment)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Référence</p>
                  <p className="font-medium text-xs">{requestData.id.substring(0, 8)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <p className="text-sm text-gray-500 mb-8 max-w-md">
          Vous recevrez bientôt un email de confirmation avec les détails de votre demande. 
          Si vous avez des questions, n'hésitez pas à nous contacter.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" asChild>
            <Link to="/">Retour à l'accueil</Link>
          </Button>
          <Button asChild>
            <Link to="/catalog">Continuer vos achats</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default RequestSentPage;
