import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, RefreshCw, User, Clock, Calendar } from 'lucide-react';

interface TrialStatus {
  is_trial: boolean;
  trial_ends_at: string | null;
  days_remaining: number;
  company_name: string | null;
  prospect_email: string | null;
}

const TrialAwareSubscriptionCard: React.FC = () => {
  const { user, subscription, checkSubscription, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [trialLoading, setTrialLoading] = useState(true);

  const planNames = {
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business'
  };

  useEffect(() => {
    fetchTrialStatus();
  }, []);

  const fetchTrialStatus = async () => {
    try {
      setTrialLoading(true);
      const { data, error } = await supabase.rpc('get_user_trial_status');
      
      if (error) {
        console.error('Erreur lors de la récupération du statut d\'essai:', error);
        return;
      }

      if (data && data.length > 0) {
        setTrialStatus(data[0]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du statut d\'essai:', error);
    } finally {
      setTrialLoading(false);
    }
  };

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
    await fetchTrialStatus();
    setLoading(false);
    toast.success('Statut d\'abonnement mis à jour');
  };

  const getTrialBadge = () => {
    if (!trialStatus?.is_trial) return null;

    const daysRemaining = trialStatus.days_remaining;
    const badgeColor = daysRemaining <= 3 ? 'bg-red-100 text-red-800' : 
                      daysRemaining <= 7 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-blue-100 text-blue-800';

    return (
      <Badge className={`${badgeColor} flex items-center gap-1`}>
        <Clock className="h-3 w-3" />
        Essai gratuit - {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
      </Badge>
    );
  };

  const getCurrentPlanBadge = () => {
    if (trialStatus?.is_trial) {
      return getTrialBadge();
    }

    if (subscription?.subscribed) {
      return (
        <Badge className="bg-green-100 text-green-800">
          {planNames[subscription.subscription_tier as keyof typeof planNames] || subscription.subscription_tier}
        </Badge>
      );
    }

    return <Badge variant="secondary">Aucun abonnement actif</Badge>;
  };

  return (
    <div className="space-y-6">
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
                {trialLoading ? (
                  <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  getCurrentPlanBadge()
                )}
              </div>
              
              {trialStatus?.is_trial && trialStatus.trial_ends_at && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Expire le: {new Date(trialStatus.trial_ends_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
              
              {subscription?.subscription_end && !trialStatus?.is_trial && (
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

          {/* Trial Warning */}
          {trialStatus?.is_trial && trialStatus.days_remaining <= 7 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">
                    Votre essai gratuit expire bientôt
                  </p>
                  <p className="text-yellow-700 text-sm">
                    Il vous reste {trialStatus.days_remaining} jour{trialStatus.days_remaining > 1 ? 's' : ''} pour profiter de toutes les fonctionnalités. 
                    Souscrivez à un plan pour continuer.
                  </p>
                </div>
              </div>
              <Button
                className="mt-3"
                onClick={() => window.location.href = '/signup'}
              >
                Choisir un plan
              </Button>
            </div>
          )}

          {/* No subscription warning */}
          {!subscription?.subscribed && !trialStatus?.is_trial && (
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
          
          {trialStatus?.is_trial && trialStatus.company_name && (
            <div>
              <label className="text-sm font-medium text-gray-600">Entreprise (essai)</label>
              <p className="text-lg">{trialStatus.company_name}</p>
            </div>
          )}
          
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
    </div>
  );
};

export default TrialAwareSubscriptionCard;