
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="text-6xl font-bold text-primary mb-2">404</div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
              Page non trouvée
            </h1>
            <p className="text-gray-600">
              La page que vous recherchez n'existe pas ou a été déplacée.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Retour au tableau de bord
            </Button>
            
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Page précédente
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">
              Besoin d'aide ? Contactez le support technique.
            </p>
            <div className="flex justify-center space-x-4 text-xs text-gray-400">
              <span>Code erreur: 404</span>
              <span>•</span>
              <span>Référence: {Date.now()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
