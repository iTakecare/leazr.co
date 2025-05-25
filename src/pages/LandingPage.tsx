
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, Users, BarChart, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Users className="h-6 w-6 text-slate-600" />,
      title: "CRM Intégré",
      description: "Gérez vos clients et prospects efficacement"
    },
    {
      icon: <BarChart className="h-6 w-6 text-slate-600" />,
      title: "Calculateur Intelligent",
      description: "Automatisez vos calculs de leasing"
    },
    {
      icon: <Shield className="h-6 w-6 text-slate-600" />,
      title: "Contrats Digitaux",
      description: "Signature électronique intégrée"
    },
    {
      icon: <Zap className="h-6 w-6 text-slate-600" />,
      title: "Catalogue Produits",
      description: "Gestion centralisée de vos équipements"
    }
  ];

  const stats = [
    { value: "60%", label: "Temps économisé" },
    { value: "500+", label: "Entreprises clientes" },
    { value: "99.9%", label: "Disponibilité" },
    { value: "24/7", label: "Support client" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                L
              </div>
              <span className="text-xl font-semibold text-slate-900">Leazr</span>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900" onClick={() => navigate('/login')}>
                Connexion
              </Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={() => navigate('/signup')}>
                Commencer
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">
            Nouvelle génération de logiciel de leasing
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Simplifiez votre
            <span className="text-slate-600"> leasing informatique</span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            Leazr est la plateforme tout-en-un qui modernise la gestion de votre activité de leasing. 
            Du prospect au contrat, automatisez vos processus avec élégance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 text-lg"
              onClick={() => navigate('/signup')}
            >
              Essai gratuit 14 jours
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3 text-lg"
            >
              Voir la démo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Une suite complète d'outils pensés pour les professionnels du leasing
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-slate-200 hover:border-slate-300 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 p-3 bg-slate-50 rounded-lg w-fit">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-8">
                Pourquoi choisir Leazr ?
              </h2>
              <div className="space-y-4">
                {[
                  "Interface moderne et intuitive",
                  "Automatisation complète des processus",
                  "Sécurité bancaire et données chiffrées",
                  "Support client réactif et formation incluse",
                  "Intégrations avec vos outils existants",
                  "Mises à jour continues et innovations"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-xl border border-slate-200">
              <div className="text-center">
                <div className="text-5xl font-bold text-slate-900 mb-2">60%</div>
                <div className="text-lg text-slate-600 mb-6">
                  de temps économisé sur le traitement des offres
                </div>
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                  <p className="text-slate-700 italic mb-4">
                    "Leazr a transformé notre façon de travailler. Interface épurée, 
                    processus fluides, résultats remarquables."
                  </p>
                  <div className="text-sm text-slate-600">
                    — Marie Dubois, CEO chez TechLease
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Prêt à moderniser votre activité ?
          </h2>
          <p className="text-lg mb-10 max-w-2xl mx-auto text-slate-300">
            Rejoignez les entreprises qui font déjà confiance à Leazr 
            pour gérer leur activité de leasing informatique.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-3 text-lg"
            onClick={() => navigate('/signup')}
          >
            Commencer maintenant
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  L
                </div>
                <span className="text-lg font-semibold text-slate-900">Leazr</span>
              </div>
              <p className="text-slate-600 text-sm">
                La plateforme de référence pour le leasing informatique.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Produit</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Tarifs</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Sécurité</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Formation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Entreprise</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Carrières</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-12 pt-8 text-center text-sm text-slate-600">
            <p>&copy; 2024 Leazr. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
