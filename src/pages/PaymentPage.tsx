
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const PaymentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const { companyId, plan, modules } = location.state || {};

  useEffect(() => {
    if (!companyId || !plan) {
      navigate('/signup');
    }
  }, [companyId, plan, navigate]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // TODO: Implement Stripe payment integration
      toast.success('Paiement traité avec succès !');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
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
            {/* Récapitulatif de la commande */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Récapitulatif de votre abonnement</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Plan {plan}</span>
                  <span className="font-medium">149€/mois</span>
                </div>
                {modules && modules.length > 0 && (
                  <div>
                    <span className="text-gray-600">Modules inclus :</span>
                    <div className="mt-1">
                      {modules.map((module: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="capitalize">{module.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between font-medium">
                <span>Total mensuel</span>
                <span>149€ HT</span>
              </div>
            </div>

            {/* Formulaire de paiement */}
            <div className="space-y-4">
              <h3 className="font-medium">Informations de paiement</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="cardNumber">Numéro de carte</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="expiry">Expiration</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                  />
                </div>
              </div>
            </div>

            {/* Informations de facturation */}
            <div className="space-y-4">
              <h3 className="font-medium">Adresse de facturation</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input id="address" placeholder="123 Rue de la Paix" />
                </div>
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input id="city" placeholder="Paris" />
                </div>
                <div>
                  <Label htmlFor="postal">Code postal</Label>
                  <Input id="postal" placeholder="75001" />
                </div>
              </div>
            </div>

            <Button 
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Traitement...' : 'Finaliser l\'abonnement - 149€/mois'}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              En finalisant votre abonnement, vous acceptez nos conditions d'utilisation 
              et notre politique de confidentialité. Vous pouvez annuler à tout moment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentPage;
