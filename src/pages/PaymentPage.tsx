
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PlanType {
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}

const PaymentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const { companyId, plan, modules } = location.state || {};

  useEffect(() => {
    if (!plan) {
      navigate('/signup');
    }
  }, [plan, navigate]);

  const plans: Record<string, PlanType> = {
    starter: {
      name: 'Starter',
      price: 49,
      description: 'Parfait pour débuter',
      features: ['1 module inclus', '1 utilisateur', 'Support email']
    },
    pro: {
      name: 'Pro',
      price: 149,
      description: 'Pour les équipes qui grandissent',
      features: ['Jusqu\'à 3 modules', '5 utilisateurs', 'Support prioritaire', 'Intégrations avancées'],
      popular: true
    },
    business: {
      name: 'Business',
      price: 299,
      description: 'Pour les grandes organisations',
      features: ['Tous les modules', '10 utilisateurs', 'Support dédié', 'Personnalisation avancée']
    }
  };

  const selectedPlan = plans[plan as keyof typeof plans];

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vous devez être connecté pour procéder au paiement');
        navigate('/login');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      toast.error('Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Finaliser votre abonnement
            </CardTitle>
            <CardDescription>
              Sécurisez votre accès à Leazr avec votre méthode de paiement préférée
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedPlan && (
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">{selectedPlan.name}</h3>
                  {selectedPlan.popular && (
                    <Badge className="bg-blue-600">Populaire</Badge>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{selectedPlan.description}</p>
                <div className="text-3xl font-bold text-blue-600 mb-4">
                  {selectedPlan.price}€<span className="text-lg text-gray-600">/mois</span>
                </div>
                <div className="space-y-2">
                  {selectedPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                {modules && modules.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-gray-600">Modules inclus :</span>
                    <div className="mt-2 space-y-1">
                      {modules.map((module: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="capitalize text-sm">{module.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Redirection vers Stripe...' : `S'abonner pour ${selectedPlan?.price}€/mois`}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              En finalisant votre abonnement, vous acceptez nos conditions d'utilisation 
              et notre politique de confidentialité. Vous pouvez annuler à tout moment 
              depuis votre espace client.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentPage;
