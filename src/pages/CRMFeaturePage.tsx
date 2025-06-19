
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Target, BarChart3, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';

const CRMFeaturePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      <section className="py-20 px-6">
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

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-xl font-bold text-blue-600 mb-4">Leazr</div>
              <p className="text-slate-600 text-sm">
                💼 La solution métier de référence pour le leasing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">📦 Solution</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button className="hover:text-blue-600 transition-colors">⚡ Fonctionnalités</button></li>
                <li><button className="hover:text-blue-600 transition-colors">💰 Tarifs</button></li>
                <li><button className="hover:text-blue-600 transition-colors">🔒 Sécurité</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">🆘 Support</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button className="hover:text-blue-600 transition-colors">📚 Documentation</button></li>
                <li><button className="hover:text-blue-600 transition-colors">📞 Contact</button></li>
                <li><button className="hover:text-blue-600 transition-colors">🎓 Formation</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">🏢 Entreprise</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button className="hover:text-blue-600 transition-colors">ℹ️ À propos</button></li>
                <li><button className="hover:text-blue-600 transition-colors">📝 Blog</button></li>
                <li><button className="hover:text-blue-600 transition-colors">💼 Carrières</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-12 pt-8 text-center text-sm text-slate-600">
            <p>© 2025 Leazr.co est une marque développée par iTakecare SRL. Tous droits réservés. 💙</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CRMFeaturePage;
