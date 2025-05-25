
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, RefreshCw, User, Settings as SettingsIcon } from 'lucide-react';

const Settings: React.FC = () => {
  const { user, subscription, checkSubscription, logout } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vous devez être connecté');
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du portail client:', error);
      toast.error('Erreur lors de l\'ouverture du portail client');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setLoading(true);
    await checkSubscription();
    setLoading(false);
    toast.success('Statut d\'abonnement mis à jour');
  };

  const planNames = {
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business'
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Paramètres</h1>
      </div>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Abonnement
          </CardTitle>
          <CardDescription>
            Gérez votre abonnement et votre facturation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Plan actuel:</span>
                {subscription?.subscribed ? (
                  <Badge className="bg-green-100 text-green-800">
                    {planNames[subscription.subscription_tier as keyof typeof planNames] || subscription.subscription_tier}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Aucun abonnement actif</Badge>
                )}
              </div>
              {subscription?.subscription_end && (
                <p className="text-sm text-gray-600 mt-1">
                  Expire le: {new Date(subscription.subscription_end).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshSubscription}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              {subscription?.subscribed && (
                <Button
                  onClick={handleManageSubscription}
                  disabled={loading}
                >
                  Gérer l'abonnement
                </Button>
              )}
            </div>
          </div>

          {!subscription?.subscribed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                Aucun abonnement actif. Souscrivez à un plan pour accéder à toutes les fonctionnalités.
              </p>
              <Button
                className="mt-2"
                onClick={() => window.location.href = '/signup'}
              >
                Choisir un plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations du compte
          </CardTitle>
          <CardDescription>
            Vos informations personnelles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <p className="text-lg">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">ID utilisateur</label>
            <p className="text-sm text-gray-500 font-mono">{user?.id}</p>
          </div>
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={logout}>
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Panel (Subscription Details) */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Détails techniques</CardTitle>
            <CardDescription>
              Informations détaillées sur votre abonnement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(subscription, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;
