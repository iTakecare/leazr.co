import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const TrialActivationSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Essai activé avec succès !
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Votre essai gratuit de 14 jours a été activé. Vous pouvez maintenant explorer toutes les fonctionnalités de Leazr.
          </p>
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Accéder au tableau de bord
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialActivationSuccessPage;