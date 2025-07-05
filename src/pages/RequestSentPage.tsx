import React, { useEffect, useState } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Container from '@/components/layout/Container';
import MainNavigation from '@/components/layout/MainNavigation';

interface RequestSentState {
  success: boolean;
  companyName?: string;
  name?: string;
}

const RequestSentPage: React.FC = () => {
  const location = useLocation();
  const [requestData, setRequestData] = useState<any>(null);
  
  const state = location.state as RequestSentState || { success: false };

  useEffect(() => {
    const lastRequest = sessionStorage.getItem('lastSubmittedRequest');
    if (lastRequest) {
      try {
        setRequestData(JSON.parse(lastRequest));
      } catch (e) {
        console.error("Error parsing request data:", e);
      }
    }
  }, []);

  if (!state?.success && !location.state) {
    console.log("No success state found, redirecting to home");
    return <Navigate to="/" replace />;
  }

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
              <Link to="/catalog/anonymous">Retour au catalogue</Link>
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  const getCompanyIdLabel = () => {
    if (!requestData) return "Référence";
    
    switch(requestData.client_country) {
      case 'FR': 
        return "SIRET/SIREN";
      case 'LU': 
        return "N° d'identification";
      default: 
        return "N° d'entreprise";
    }
  };

  const parseEquipmentDescription = (description: string) => {
    // Parse format: "Product Name - Prix: XX,XX € (YY,YY €/mois) x Quantity - Options: Option1: Value1, Option2: Value2"
    const items = description.split('\n').map(line => {
      // Extract product name (before " - Prix:")
      const productMatch = line.match(/^(.+?)\s*-\s*Prix:/);
      const productName = productMatch ? productMatch[1].trim() : line;

      // Extract monthly price (between parentheses)
      const monthlyMatch = line.match(/\(([0-9,]+\s*€)\/mois\)/);
      const monthlyPrice = monthlyMatch ? monthlyMatch[1] : '';

      // Extract quantity (after " x ")
      const quantityMatch = line.match(/x\s*(\d+)/);
      const quantity = quantityMatch ? quantityMatch[1] : '1';

      // Extract options (after "Options: ")
      const optionsMatch = line.match(/Options:\s*(.+)$/);
      const options = optionsMatch ? optionsMatch[1].replace(/:\s*/g, ' ').replace(/,\s*/g, '  -  ') : '';

      return {
        productName,
        quantity,
        options,
        monthlyPrice
      };
    });

    return items;
  };

  return (
    <>
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-2xl mx-auto text-center">
          <div className="mb-6 bg-green-100 p-4 rounded-full">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Demande envoyée avec succès!</h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Merci {state.name} pour votre demande. Notre équipe commerciale vous contactera prochainement.
          </p>
          
          {/* Section Prochaines étapes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 w-full">
            <h2 className="text-xl font-semibold mb-4 text-blue-900">Prochaines étapes</h2>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium text-blue-900">Analyse de votre demande</p>
                  <p className="text-sm text-blue-700">Notre équipe étudie votre dossier (sous 24h ouvrables)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium text-blue-900">Soumission au partenaire financier</p>
                  <p className="text-sm text-blue-700">Validation du financement selon votre profil</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium text-blue-900">Prise de contact</p>
                  <p className="text-sm text-blue-700">Nous vous contactons pour finaliser votre dossier</p>
                </div>
              </div>
            </div>
          </div>
          
          {requestData && (
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm w-full mb-8 text-left">
              <h2 className="font-semibold mb-4 text-center">Résumé de votre demande</h2>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Entreprise</p>
                    <p className="font-medium">{state.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pays</p>
                    <p className="font-medium">
                      {requestData.client_country === 'FR' 
                        ? 'France' 
                        : requestData.client_country === 'LU' 
                          ? 'Luxembourg' 
                          : 'Belgique'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">{getCompanyIdLabel()}</p>
                  <p className="font-medium">{requestData.client_vat_number}</p>
                </div>
                
                {requestData.client_is_vat_exempt && (
                  <div>
                    <p className="text-sm text-gray-500">Statut TVA</p>
                    <p className="font-medium">Non assujetti à la TVA</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500 mb-3">Équipement demandé</p>
                  {parseEquipmentDescription(requestData.equipment_description).map((item, index) => (
                    <div key={index} className="mb-4 last:mb-0">
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <span className="text-sm text-gray-500">Équipement :</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Quantité:</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <span className="font-medium">{item.productName}</span>
                        </div>
                        <div>
                          <span className="font-medium">{item.quantity}</span>
                        </div>
                      </div>
                      {item.options && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-500 mb-1">Options:</p>
                          <p className="font-medium">{item.options}</p>
                        </div>
                      )}
                      {item.monthlyPrice && (
                        <div>
                          <span className="font-medium text-blue-600">Mensualité: {item.monthlyPrice} HTVA</span>
                        </div>
                      )}
                    </div>
                  ))}
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
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" asChild>
              <Link to="/contact">Nous contacter</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/catalog/anonymous">Retour au catalogue</Link>
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
};

export default RequestSentPage;
