
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Target, BarChart3, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainNavigation from '@/components/layout/MainNavigation';

const CRMFeaturePage: React.FC = () => {
  const navigate = useNavigate();

  console.log('CRMFeaturePage is rendering');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <MainNavigation />
      
      <section className="pt-32 py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            🤝 CRM Intégré
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              CRM Intégré
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Spécialisé Leasing
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Gérez vos clients et prospects efficacement avec notre CRM pensé 
            spécifiquement pour le secteur du leasing.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl">Gestion Clients Avancée</CardTitle>
                <CardDescription>Centralisez toutes vos informations clients</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Fiches clients complètes</li>
                  <li>• Historique des interactions</li>
                  <li>• Suivi des contrats en cours</li>
                  <li>• Alertes automatiques</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Target className="h-12 w-12 text-emerald-600 mb-4" />
                <CardTitle className="text-xl">Pipeline de Vente</CardTitle>
                <CardDescription>Optimisez votre processus commercial</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Suivi des opportunités</li>
                  <li>• Étapes personnalisables</li>
                  <li>• Prévisions de vente</li>
                  <li>• Conversion tracking</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle className="text-xl">Analytics & Reporting</CardTitle>
                <CardDescription>Analysez vos performances en temps réel</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Tableaux de bord personnalisés</li>
                  <li>• KPI sectoriels</li>
                  <li>• Rapports automatisés</li>
                  <li>• Export des données</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-orange-600 mb-4" />
                <CardTitle className="text-xl">Communication Intégrée</CardTitle>
                <CardDescription>Restez en contact avec vos clients</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Email marketing intégré</li>
                  <li>• Templates personnalisés</li>
                  <li>• Suivi des campagnes</li>
                  <li>• Notifications automatiques</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Prêt à transformer votre relation client ?
          </h2>
          <Button onClick={() => navigate('/signup')} size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            Découvrir le CRM
          </Button>
        </div>
      </section>
    </div>
  );
};

export default CRMFeaturePage;
