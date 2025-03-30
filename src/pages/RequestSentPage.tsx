
import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, ShoppingBag } from 'lucide-react';
import PublicHeader from '@/components/catalog/public/PublicHeader';

const RequestSentPage: React.FC = () => {
  const location = useLocation();
  const { success, companyName, name } = location.state || {};
  
  // If accessed directly without success state, redirect to home
  if (!success) {
    return <Navigate to="/catalogue" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm text-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold mb-4">Demande envoyée avec succès !</h1>
          
          <p className="text-gray-700 mb-6">
            Merci {name} pour votre demande.
            <br /><br />
            Notre équipe va étudier votre demande dans les plus brefs délais et vous contactera à l'adresse email que vous avez fournie.
            <br /><br />
            Un récapitulatif de votre demande a été envoyé à votre adresse email.
          </p>
          
          <div className="space-y-4">
            <Button asChild size="lg" className="w-full">
              <Link to="/catalogue">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Continuer mes achats
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestSentPage;
