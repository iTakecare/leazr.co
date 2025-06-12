
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BarChart, Users, FileText, TrendingUp, CheckCircle, RefreshCw } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, subscription, checkSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = React.useState(false);

  // Check for payment success
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Paiement réussi ! Votre abonnement est maintenant actif.');
      checkSubscription();
    }
  }, [searchParams, checkSubscription]);

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

  const stats = [
    {
      title: 'Offres créées',
      value: '12',
      description: 'Ce mois-ci',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Clients actifs',
      value: '8',
      description: 'Total',
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'Chiffre d\'affaires',
      value: '45 670€',
      description: 'Ce mois-ci',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      title: 'Taux de conversion',
      value: '67%',
      description: 'Offres signées',
      icon: BarChart,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Bonjour {user?.email?.split('@')[0]}, voici un aperçu de votre activité</p>
        </div>
        
        {/* Subscription Status */}
        <Card className={`min-w-[300px] ${subscription?.subscribed ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Abonnement</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshSubscription}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {subscription?.subscribed ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <Badge className="bg-green-100 text-green-800">
                      Plan {planNames[subscription.subscription_tier as keyof typeof planNames] || subscription.subscription_tier}
                    </Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary">Aucun abonnement</Badge>
                  </>
                )}
              </div>
              {subscription?.subscription_end && (
                <p className="text-sm text-gray-600">
                  Expire le: {new Date(subscription.subscription_end).toLocaleDateString('fr-FR')}
                </p>
              )}
              {!subscription?.subscribed && (
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => navigate('/signup')}
                >
                  Choisir un plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          className="h-20 flex-col gap-2"
          onClick={() => navigate('/admin/offers')}
          disabled={!subscription?.subscribed}
        >
          <FileText className="h-6 w-6" />
          Nouvelle offre
        </Button>
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => navigate('/admin/clients')}
          disabled={!subscription?.subscribed}
        >
          <Users className="h-6 w-6" />
          Gérer les clients
        </Button>
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => navigate('/admin/offers')}
          disabled={!subscription?.subscribed}
        >
          <BarChart className="h-6 w-6" />
          Voir les rapports
        </Button>
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => navigate('/admin/settings')}
        >
          <TrendingUp className="h-6 w-6" />
          Paramètres
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className={!subscription?.subscribed ? 'opacity-50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscription?.subscribed ? stat.value : '---'}</div>
              <p className="text-xs text-gray-600">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>
            Vos dernières actions sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscription?.subscribed ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Offre créée pour TechCorp</p>
                  <p className="text-xs text-gray-600">Il y a 2 heures</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Client ajouté: StartupXYZ</p>
                  <p className="text-xs text-gray-600">Il y a 1 jour</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Contrat signé par InnovCorp</p>
                  <p className="text-xs text-gray-600">Il y a 3 jours</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Souscrivez à un abonnement pour voir votre activité</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
